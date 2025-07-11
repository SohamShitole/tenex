import re
import os
import pandas as pd
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import logging
from flask import current_app

from app import db
from app.models import LogFile, LogEntry
from app.services.anomaly import AnomalyDetectionService

logger = logging.getLogger(__name__)


class LogFormat:
    """Base class for log format parsers"""
    
    def __init__(self):
        self.name = "unknown"
        self.pattern = None
        self.fields = []
    
    def detect(self, sample_lines: List[str]) -> bool:
        """Detect if this format matches the sample lines"""
        return False
    
    def parse_line(self, line: str) -> Optional[Dict]:
        """Parse a single log line into a dictionary"""
        return None


class ZscalerLogFormat(LogFormat):
    """ZScaler Web Proxy log format parser"""
    
    def __init__(self):
        super().__init__()
        self.name = "zscaler"
        # ZScaler format: timestamp url action threatclass threatname fileclass dlpdictionaries dlpengine filetype appname appclass appriskscore
        self.pattern = re.compile(
            r'(?P<timestamp>\S+\s+\S+)\s+'
            r'(?P<url>\S+)\s+'
            r'(?P<action>\S+)\s+'
            r'(?P<threat_class>\S+)\s+'
            r'(?P<threat_name>\S+)\s+'
            r'(?P<file_class>\S+)\s+'
            r'(?P<dlp_dictionaries>\S+)\s+'
            r'(?P<dlp_engine>\S+)\s+'
            r'(?P<file_type>\S+)\s+'
            r'(?P<app_name>\S+)\s+'
            r'(?P<app_class>\S+)\s+'
            r'(?P<app_risk_score>\S+)'
        )
        
        # Alternative ZScaler format
        self.pattern_alt = re.compile(
            r'(?P<timestamp>\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+'
            r'(?P<method>\S+)\s+'
            r'(?P<url>https?://\S+)\s+'
            r'(?P<status>\d+)\s+'
            r'(?P<bytes>\d+)\s+'
            r'(?P<src_ip>\d+\.\d+\.\d+\.\d+)\s+'
            r'"?(?P<user_agent>[^"]*)"?'
        )
    
    def detect(self, sample_lines: List[str]) -> bool:
        """Detect ZScaler format"""
        for line in sample_lines[:5]:  # Check first 5 lines
            if self.pattern.match(line.strip()) or self.pattern_alt.match(line.strip()):
                return True
        return False
    
    def parse_line(self, line: str) -> Optional[Dict]:
        """Parse ZScaler log line"""
        line = line.strip()
        if not line:
            return None
        
        # Try primary pattern
        match = self.pattern.match(line)
        if match:
            data = match.groupdict()
            return {
                'timestamp': self._parse_timestamp(data['timestamp']),
                'url': data['url'],
                'dest_host': self._extract_host(data['url']),
                'parsed_fields': {
                    'action': data['action'],
                    'threat_class': data['threat_class'],
                    'threat_name': data['threat_name'],
                    'file_class': data['file_class'],
                    'app_name': data['app_name'],
                    'app_class': data['app_class'],
                    'app_risk_score': data['app_risk_score']
                }
            }
        
        # Try alternative pattern
        match = self.pattern_alt.match(line)
        if match:
            data = match.groupdict()
            return {
                'timestamp': self._parse_timestamp(data['timestamp']),
                'src_ip': data['src_ip'],
                'method': data['method'],
                'url': data['url'],
                'dest_host': self._extract_host(data['url']),
                'status_code': int(data['status']),
                'response_size': int(data['bytes']),
                'user_agent': data['user_agent']
            }
        
        return None
    
    def _parse_timestamp(self, timestamp_str: str) -> datetime:
        """Parse timestamp from various formats"""
        formats = [
            '%Y-%m-%d %H:%M:%S',
            '%d/%b/%Y:%H:%M:%S',
            '%Y/%m/%d %H:%M:%S'
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(timestamp_str, fmt)
            except ValueError:
                continue
        
        # Default to current time if parsing fails
        logger.warning(f"Could not parse timestamp: {timestamp_str}")
        return datetime.utcnow()
    
    def _extract_host(self, url: str) -> str:
        """Extract hostname from URL"""
        try:
            if url.startswith('http'):
                from urllib.parse import urlparse
                return urlparse(url).netloc
            return url.split('/')[0] if '/' in url else url
        except:
            return url


class NginxLogFormat(LogFormat):
    """Nginx access log format parser"""
    
    def __init__(self):
        super().__init__()
        self.name = "nginx"
        # Nginx combined log format
        self.pattern = re.compile(
            r'(?P<src_ip>\d+\.\d+\.\d+\.\d+)\s+'
            r'(?P<ident>\S+)\s+'
            r'(?P<auth>\S+)\s+'
            r'\[(?P<timestamp>[^\]]+)\]\s+'
            r'"(?P<method>\S+)\s+(?P<url>\S+)\s+(?P<protocol>[^"]+)"\s+'
            r'(?P<status>\d+)\s+'
            r'(?P<bytes>\S+)\s+'
            r'"(?P<referer>[^"]*)"\s+'
            r'"(?P<user_agent>[^"]*)"'
        )
    
    def detect(self, sample_lines: List[str]) -> bool:
        """Detect Nginx format"""
        for line in sample_lines[:5]:
            if self.pattern.match(line.strip()):
                return True
        return False
    
    def parse_line(self, line: str) -> Optional[Dict]:
        """Parse Nginx log line"""
        line = line.strip()
        if not line:
            return None
        
        match = self.pattern.match(line)
        if not match:
            return None
        
        data = match.groupdict()
        
        # Parse bytes (can be '-' for 0)
        try:
            bytes_val = int(data['bytes']) if data['bytes'] != '-' else 0
        except ValueError:
            bytes_val = 0
        
        return {
            'timestamp': self._parse_timestamp(data['timestamp']),
            'src_ip': data['src_ip'],
            'method': data['method'],
            'url': data['url'],
            'dest_host': self._extract_host_from_request(data.get('host', '')),
            'status_code': int(data['status']),
            'response_size': bytes_val,
            'user_agent': data['user_agent'],
            'referer': data['referer'] if data['referer'] != '-' else None,
            'parsed_fields': {
                'protocol': data['protocol'],
                'ident': data['ident'],
                'auth': data['auth']
            }
        }
    
    def _parse_timestamp(self, timestamp_str: str) -> datetime:
        """Parse Nginx timestamp format"""
        # Format: 10/Oct/2000:13:55:36 +0000
        try:
            # Remove timezone info for simplicity
            ts_clean = timestamp_str.split(' ')[0]
            return datetime.strptime(ts_clean, '%d/%b/%Y:%H:%M:%S')
        except ValueError:
            logger.warning(f"Could not parse timestamp: {timestamp_str}")
            return datetime.utcnow()
    
    def _extract_host_from_request(self, host_header: str) -> str:
        """Extract host from request or host header"""
        if host_header and host_header != '-':
            return host_header
        return 'unknown'


class ApacheLogFormat(LogFormat):
    """Apache access log format parser"""
    
    def __init__(self):
        super().__init__()
        self.name = "apache"
        # Apache common log format
        self.pattern = re.compile(
            r'(?P<src_ip>\d+\.\d+\.\d+\.\d+)\s+'
            r'(?P<ident>\S+)\s+'
            r'(?P<auth>\S+)\s+'
            r'\[(?P<timestamp>[^\]]+)\]\s+'
            r'"(?P<request>[^"]+)"\s+'
            r'(?P<status>\d+)\s+'
            r'(?P<bytes>\S+)'
        )
    
    def detect(self, sample_lines: List[str]) -> bool:
        """Detect Apache format"""
        for line in sample_lines[:5]:
            if self.pattern.match(line.strip()):
                return True
        return False
    
    def parse_line(self, line: str) -> Optional[Dict]:
        """Parse Apache log line"""
        line = line.strip()
        if not line:
            return None
        
        match = self.pattern.match(line)
        if not match:
            return None
        
        data = match.groupdict()
        
        # Parse request string
        request_parts = data['request'].split(' ')
        method = request_parts[0] if len(request_parts) > 0 else 'GET'
        url = request_parts[1] if len(request_parts) > 1 else '/'
        
        # Parse bytes
        try:
            bytes_val = int(data['bytes']) if data['bytes'] != '-' else 0
        except ValueError:
            bytes_val = 0
        
        return {
            'timestamp': self._parse_timestamp(data['timestamp']),
            'src_ip': data['src_ip'],
            'method': method,
            'url': url,
            'dest_host': 'localhost',  # Apache logs typically don't include dest host
            'status_code': int(data['status']),
            'response_size': bytes_val,
            'parsed_fields': {
                'ident': data['ident'],
                'auth': data['auth'],
                'full_request': data['request']
            }
        }
    
    def _parse_timestamp(self, timestamp_str: str) -> datetime:
        """Parse Apache timestamp format"""
        # Format: 10/Oct/2000:13:55:36 +0000
        try:
            ts_clean = timestamp_str.split(' ')[0]
            return datetime.strptime(ts_clean, '%d/%b/%Y:%H:%M:%S')
        except ValueError:
            logger.warning(f"Could not parse timestamp: {timestamp_str}")
            return datetime.utcnow()


class LogParserService:
    """Main log parsing service"""
    
    def __init__(self):
        self.formats = [
            ZscalerLogFormat(),
            NginxLogFormat(),
            ApacheLogFormat()
        ]
        self.anomaly_service = AnomalyDetectionService()
    
    def detect_format(self, file_path: str) -> Optional[LogFormat]:
        """Detect log format by examining sample lines"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                sample_lines = []
                for i, line in enumerate(f):
                    if i >= 10:  # Read first 10 lines for detection
                        break
                    if line.strip():
                        sample_lines.append(line.strip())
            
            for format_parser in self.formats:
                if format_parser.detect(sample_lines):
                    logger.info(f"Detected log format: {format_parser.name}")
                    return format_parser
            
            logger.warning("Could not detect log format")
            return None
            
        except Exception as e:
            logger.error(f"Error detecting log format: {str(e)}")
            return None
    
    def process_log_file_async(self, log_id: str):
        """Start asynchronous processing of a log file"""
        try:
            # In a real application, this would be a Celery task
            # For now, we'll process synchronously but update status
            self.process_log_file(log_id)
        except Exception as e:
            logger.error(f"Error in async processing: {str(e)}")
            # Update log file status to error
            log_file = LogFile.query.get(log_id)
            if log_file:
                log_file.status = 'error'
                log_file.error_message = str(e)
                db.session.commit()
    
    def process_log_file(self, log_id: str):
        """Process a log file and extract entries"""
        log_file = LogFile.query.get(log_id)
        if not log_file:
            raise ValueError(f"Log file not found: {log_id}")
        
        try:
            logger.info(f"Starting processing of log file: {log_file.original_filename}")
            log_file.status = 'processing'
            log_file.processing_progress = 0
            db.session.commit()
            
            # Detect format
            format_parser = self.detect_format(log_file.file_path)
            if not format_parser:
                raise ValueError("Could not detect log format")
            
            log_file.log_format = format_parser.name
            log_file.processing_progress = 10
            db.session.commit()
            
            # Parse entries
            entries = self._parse_file(log_file.file_path, format_parser)
            log_file.processing_progress = 50
            db.session.commit()
            
            # Store entries in database
            self._store_entries(log_id, entries)
            log_file.processing_progress = 70
            db.session.commit()
            
            # Generate summary
            summary = self._generate_summary(entries)
            log_file.summary = summary
            log_file.total_entries = len(entries)
            
            if entries:
                log_file.date_range_start = min(entry['timestamp'] for entry in entries)
                log_file.date_range_end = max(entry['timestamp'] for entry in entries)
            
            log_file.processing_progress = 80
            db.session.commit()
            
            # Run anomaly detection
            self.anomaly_service.detect_anomalies(log_id)
            
            # Mark as completed
            log_file.status = 'ready'
            log_file.processing_progress = 100
            log_file.processed_at = datetime.utcnow()
            db.session.commit()
            
            logger.info(f"Successfully processed log file: {log_file.original_filename}")
            
        except Exception as e:
            logger.error(f"Error processing log file {log_id}: {str(e)}")
            log_file.status = 'error'
            log_file.error_message = str(e)
            db.session.commit()
            raise
    
    def _parse_file(self, file_path: str, format_parser: LogFormat) -> List[Dict]:
        """Parse entire log file"""
        entries = []
        line_number = 0
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    line_number += 1
                    
                    if not line.strip():
                        continue
                    
                    parsed = format_parser.parse_line(line)
                    if parsed:
                        parsed['raw_log'] = line.strip()
                        parsed['line_number'] = line_number
                        entries.append(parsed)
                    
                    # Progress update every 1000 lines
                    if line_number % 1000 == 0:
                        logger.info(f"Parsed {line_number} lines, found {len(entries)} valid entries")
            
            logger.info(f"Parsing complete: {len(entries)} entries from {line_number} lines")
            return entries
            
        except Exception as e:
            logger.error(f"Error parsing file: {str(e)}")
            raise
    
    def _store_entries(self, log_id: str, entries: List[Dict]):
        """Store parsed entries in database"""
        try:
            # Batch insert for performance
            batch_size = 1000
            for i in range(0, len(entries), batch_size):
                batch = entries[i:i + batch_size]
                db_entries = []
                
                for entry in batch:
                    db_entry = LogEntry(
                        log_id=log_id,
                        timestamp=entry['timestamp'],
                        src_ip=entry.get('src_ip'),
                        dest_host=entry.get('dest_host'),
                        method=entry.get('method'),
                        url=entry.get('url'),
                        status_code=entry.get('status_code'),
                        response_size=entry.get('response_size'),
                        user_agent=entry.get('user_agent'),
                        referer=entry.get('referer'),
                        raw_log=entry['raw_log'],
                        parsed_fields=entry.get('parsed_fields'),
                        line_number=entry['line_number']
                    )
                    db_entries.append(db_entry)
                
                db.session.bulk_save_objects(db_entries)
                db.session.commit()
                
                logger.info(f"Stored batch {i//batch_size + 1}: {len(batch)} entries")
            
        except Exception as e:
            logger.error(f"Error storing entries: {str(e)}")
            db.session.rollback()
            raise
    
    def _generate_summary(self, entries: List[Dict]) -> Dict:
        """Generate summary statistics for the log file"""
        if not entries:
            return {}
        
        try:
            # Convert to DataFrame for easy analysis
            df = pd.DataFrame(entries)
            
            summary = {
                'total_entries': len(entries),
                'date_range': {
                    'start': min(entry['timestamp'] for entry in entries).isoformat(),
                    'end': max(entry['timestamp'] for entry in entries).isoformat()
                },
                'unique_ips': len(df['src_ip'].dropna().unique()) if 'src_ip' in df.columns else 0,
                'unique_hosts': len(df['dest_host'].dropna().unique()) if 'dest_host' in df.columns else 0,
                'methods': df['method'].value_counts().to_dict() if 'method' in df.columns else {},
                'status_codes': df['status_code'].value_counts().to_dict() if 'status_code' in df.columns else {},
                'top_ips': df['src_ip'].value_counts().head(10).to_dict() if 'src_ip' in df.columns else {},
                'top_hosts': df['dest_host'].value_counts().head(10).to_dict() if 'dest_host' in df.columns else {},
                'hourly_distribution': self._get_hourly_distribution(entries)
            }
            
            return summary
            
        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            return {'error': str(e)}
    
    def _get_hourly_distribution(self, entries: List[Dict]) -> Dict:
        """Get distribution of entries by hour of day"""
        try:
            hourly_counts = {}
            for entry in entries:
                hour = entry['timestamp'].hour
                hourly_counts[hour] = hourly_counts.get(hour, 0) + 1
            
            return hourly_counts
        except Exception as e:
            logger.error(f"Error calculating hourly distribution: {str(e)}")
            return {} 