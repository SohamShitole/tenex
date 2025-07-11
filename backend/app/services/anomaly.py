import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import logging
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer
import ipaddress

from app import db
from app.models import LogFile, LogEntry, Anomaly

logger = logging.getLogger(__name__)


class AnomalyDetectionService:
    """Machine learning-based anomaly detection for log analysis"""
    
    def __init__(self):
        self.contamination = 0.1  # Expected proportion of anomalies
        self.min_samples = 10     # Minimum samples needed for ML
        
    def detect_anomalies(self, log_id: str):
        """Main method to detect anomalies in a log file"""
        try:
            logger.info(f"Starting anomaly detection for log {log_id}")
            
            # Get log entries
            log_entries = LogEntry.query.filter_by(log_id=log_id).all()
            
            if len(log_entries) < self.min_samples:
                logger.warning(f"Too few entries ({len(log_entries)}) for anomaly detection")
                return
            
            # Convert to DataFrame for easier processing
            df = self._entries_to_dataframe(log_entries)
            
            # Feature engineering
            features_df = self._engineer_features(df)
            
            # Detect different types of anomalies
            anomalies = []
            
            # Volume-based anomalies
            volume_anomalies = self._detect_volume_anomalies(df, features_df)
            anomalies.extend(volume_anomalies)
            
            # Behavioral anomalies
            behavioral_anomalies = self._detect_behavioral_anomalies(df, features_df)
            anomalies.extend(behavioral_anomalies)
            
            # Temporal anomalies
            temporal_anomalies = self._detect_temporal_anomalies(df, features_df)
            anomalies.extend(temporal_anomalies)
            
            # Pattern-based anomalies
            pattern_anomalies = self._detect_pattern_anomalies(df, features_df)
            anomalies.extend(pattern_anomalies)
            
            # Store anomalies in database
            self._store_anomalies(log_id, anomalies)
            
            logger.info(f"Detected {len(anomalies)} anomalies for log {log_id}")
            
        except Exception as e:
            logger.error(f"Error in anomaly detection for log {log_id}: {str(e)}")
            raise
    
    def _entries_to_dataframe(self, log_entries: List[LogEntry]) -> pd.DataFrame:
        """Convert log entries to pandas DataFrame"""
        data = []
        for entry in log_entries:
            data.append({
                'id': entry.id,
                'timestamp': entry.timestamp,
                'src_ip': str(entry.src_ip) if entry.src_ip else None,
                'dest_host': entry.dest_host,
                'method': entry.method,
                'url': entry.url,
                'status_code': entry.status_code,
                'response_size': entry.response_size or 0,
                'user_agent': entry.user_agent,
                'referer': entry.referer,
                'raw_log': entry.raw_log
            })
        
        df = pd.DataFrame(data)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        return df
    
    def _engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Engineer features for anomaly detection"""
        features_df = df.copy()
        
        # Time-based features
        features_df['hour'] = df['timestamp'].dt.hour
        features_df['day_of_week'] = df['timestamp'].dt.dayofweek
        features_df['minute'] = df['timestamp'].dt.minute
        
        # IP-based features
        features_df['is_private_ip'] = df['src_ip'].apply(self._is_private_ip)
        features_df['ip_class'] = df['src_ip'].apply(self._get_ip_class)
        
        # URL features
        features_df['url_length'] = df['url'].str.len().fillna(0)
        features_df['url_params_count'] = df['url'].str.count('&').fillna(0)
        features_df['has_query_params'] = df['url'].str.contains('\?').fillna(False)
        
        # Status code features
        features_df['is_error_status'] = (df['status_code'] >= 400).fillna(False)
        features_df['is_server_error'] = (df['status_code'] >= 500).fillna(False)
        
        # User agent features
        features_df['ua_length'] = df['user_agent'].str.len().fillna(0)
        features_df['is_bot'] = df['user_agent'].str.contains(
            'bot|crawler|spider|scraper', case=False, na=False
        )
        
        # Response size features
        features_df['log_response_size'] = np.log1p(features_df['response_size'])
        
        return features_df
    
    def _is_private_ip(self, ip_str: str) -> bool:
        """Check if IP address is private"""
        if not ip_str or ip_str == 'None':
            return False
        try:
            ip = ipaddress.ip_address(ip_str)
            return ip.is_private
        except:
            return False
    
    def _get_ip_class(self, ip_str: str) -> str:
        """Get IP address class (A, B, C, or unknown)"""
        if not ip_str or ip_str == 'None':
            return 'unknown'
        try:
            ip = ipaddress.ip_address(ip_str)
            first_octet = int(str(ip).split('.')[0])
            if 1 <= first_octet <= 126:
                return 'A'
            elif 128 <= first_octet <= 191:
                return 'B'
            elif 192 <= first_octet <= 223:
                return 'C'
            else:
                return 'other'
        except:
            return 'unknown'
    
    def _detect_volume_anomalies(self, df: pd.DataFrame, features_df: pd.DataFrame) -> List[Dict]:
        """Detect volume-based anomalies (unusual request frequencies)"""
        anomalies = []
        
        try:
            # Group by IP and time windows
            time_window = '5T'  # 5-minute windows
            
            # Requests per IP per time window
            ip_counts = df.groupby([
                df['src_ip'], 
                pd.Grouper(key='timestamp', freq=time_window)
            ]).size().reset_index(name='request_count')
            
            if len(ip_counts) < self.min_samples:
                return anomalies
            
            # Use Isolation Forest for volume anomaly detection
            model = IsolationForest(contamination=0.05, random_state=42)
            ip_counts['anomaly_score'] = model.fit_predict(ip_counts[['request_count']])
            
            # Get decision function scores (lower = more anomalous)
            scores = model.decision_function(ip_counts[['request_count']])
            ip_counts['confidence'] = 1 - ((scores - scores.min()) / (scores.max() - scores.min()))
            
            # Filter anomalies
            volume_anomalies = ip_counts[ip_counts['anomaly_score'] == -1]
            
            for _, anomaly in volume_anomalies.iterrows():
                # Find log entries in this time window for this IP
                window_start = anomaly['timestamp']
                window_end = window_start + pd.Timedelta(time_window)
                
                matching_entries = df[
                    (df['src_ip'] == anomaly['src_ip']) &
                    (df['timestamp'] >= window_start) &
                    (df['timestamp'] < window_end)
                ]
                
                for _, entry in matching_entries.iterrows():
                    anomalies.append({
                        'entry_id': entry['id'],
                        'anomaly_type': 'volume',
                        'reason': f"Unusual request volume: {anomaly['request_count']} requests from {anomaly['src_ip']} in 5 minutes",
                        'confidence': min(anomaly['confidence'], 1.0),
                        'severity': self._calculate_severity(anomaly['confidence'], anomaly['request_count']),
                        'model_used': 'isolation_forest',
                        'feature_contributions': {
                            'request_count': float(anomaly['request_count']),
                            'time_window': time_window
                        },
                        'context_window_start': window_start,
                        'context_window_end': window_end,
                        'related_entries_count': len(matching_entries)
                    })
            
        except Exception as e:
            logger.error(f"Error in volume anomaly detection: {str(e)}")
        
        return anomalies
    
    def _detect_behavioral_anomalies(self, df: pd.DataFrame, features_df: pd.DataFrame) -> List[Dict]:
        """Detect behavioral anomalies (unusual HTTP methods, status codes, etc.)"""
        anomalies = []
        
        try:
            # Prepare features for behavioral analysis
            behavioral_features = []
            feature_names = []
            
            # Status code frequency features
            status_dist = df['status_code'].value_counts(normalize=True)
            for _, row in df.iterrows():
                features = []
                
                # Status code rarity
                status_freq = status_dist.get(row['status_code'], 0)
                features.append(status_freq)
                
                # Response size relative to status code
                same_status_sizes = df[df['status_code'] == row['status_code']]['response_size']
                if len(same_status_sizes) > 1:
                    size_zscore = (row['response_size'] - same_status_sizes.mean()) / same_status_sizes.std()
                    features.append(abs(size_zscore) if not np.isnan(size_zscore) else 0)
                else:
                    features.append(0)
                
                # Method rarity
                method_freq = df['method'].value_counts(normalize=True).get(row['method'], 0)
                features.append(method_freq)
                
                # URL length relative to others
                url_lengths = df['url'].str.len()
                if url_lengths.std() > 0:
                    url_zscore = (len(row['url']) - url_lengths.mean()) / url_lengths.std()
                    features.append(abs(url_zscore) if not np.isnan(url_zscore) else 0)
                else:
                    features.append(0)
                
                behavioral_features.append(features)
            
            if not behavioral_features:
                return anomalies
            
            # Detect anomalies using Isolation Forest
            features_array = np.array(behavioral_features)
            model = IsolationForest(contamination=0.05, random_state=42)
            anomaly_scores = model.fit_predict(features_array)
            
            # Get confidence scores
            decision_scores = model.decision_function(features_array)
            confidences = 1 - ((decision_scores - decision_scores.min()) / (decision_scores.max() - decision_scores.min()))
            
            # Create anomaly records
            for i, (_, row) in enumerate(df.iterrows()):
                if anomaly_scores[i] == -1:  # Anomaly detected
                    confidence = min(confidences[i], 1.0)
                    
                    # Generate reason based on features
                    reasons = []
                    if behavioral_features[i][0] < 0.01:  # Rare status code
                        reasons.append(f"rare status code {row['status_code']}")
                    if behavioral_features[i][2] < 0.01:  # Rare method
                        reasons.append(f"unusual HTTP method {row['method']}")
                    if behavioral_features[i][3] > 2:  # Very long URL
                        reasons.append("unusually long URL")
                    
                    reason = f"Behavioral anomaly: {', '.join(reasons) if reasons else 'unusual request pattern'}"
                    
                    anomalies.append({
                        'entry_id': row['id'],
                        'anomaly_type': 'behavioral',
                        'reason': reason,
                        'confidence': confidence,
                        'severity': self._calculate_severity(confidence),
                        'model_used': 'isolation_forest',
                        'feature_contributions': {
                            'status_frequency': behavioral_features[i][0],
                            'response_size_zscore': behavioral_features[i][1],
                            'method_frequency': behavioral_features[i][2],
                            'url_length_zscore': behavioral_features[i][3]
                        }
                    })
            
        except Exception as e:
            logger.error(f"Error in behavioral anomaly detection: {str(e)}")
        
        return anomalies
    
    def _detect_temporal_anomalies(self, df: pd.DataFrame, features_df: pd.DataFrame) -> List[Dict]:
        """Detect temporal anomalies (unusual time patterns)"""
        anomalies = []
        
        try:
            # Analyze hourly patterns
            hourly_counts = df.groupby(df['timestamp'].dt.hour).size()
            hourly_mean = hourly_counts.mean()
            hourly_std = hourly_counts.std()
            
            # Analyze per-IP hourly patterns
            for ip in df['src_ip'].dropna().unique():
                ip_data = df[df['src_ip'] == ip]
                if len(ip_data) < 5:  # Skip IPs with too few requests
                    continue
                
                ip_hourly = ip_data.groupby(ip_data['timestamp'].dt.hour).size()
                
                for hour, count in ip_hourly.items():
                    # Check if this IP's activity in this hour is unusual
                    expected_count = hourly_mean * (len(ip_data) / len(df))
                    z_score = abs((count - expected_count) / max(hourly_std, 1))
                    
                    if z_score > 2:  # Significant deviation
                        confidence = min(z_score / 5, 1.0)  # Normalize to 0-1
                        
                        # Find entries for this IP in this hour
                        hour_entries = ip_data[ip_data['timestamp'].dt.hour == hour]
                        
                        for _, entry in hour_entries.iterrows():
                            anomalies.append({
                                'entry_id': entry['id'],
                                'anomaly_type': 'temporal',
                                'reason': f"Unusual activity time: {count} requests from {ip} at hour {hour} (expected ~{expected_count:.1f})",
                                'confidence': confidence,
                                'severity': self._calculate_severity(confidence),
                                'model_used': 'statistical_analysis',
                                'feature_contributions': {
                                    'hour': hour,
                                    'actual_count': int(count),
                                    'expected_count': float(expected_count),
                                    'z_score': float(z_score)
                                }
                            })
            
        except Exception as e:
            logger.error(f"Error in temporal anomaly detection: {str(e)}")
        
        return anomalies
    
    def _detect_pattern_anomalies(self, df: pd.DataFrame, features_df: pd.DataFrame) -> List[Dict]:
        """Detect pattern-based anomalies (scanning, injection attempts, etc.)"""
        anomalies = []
        
        try:
            # Detect potential scanning behavior
            scanning_anomalies = self._detect_scanning_patterns(df)
            anomalies.extend(scanning_anomalies)
            
            # Detect potential injection attempts
            injection_anomalies = self._detect_injection_patterns(df)
            anomalies.extend(injection_anomalies)
            
            # Detect error rate anomalies
            error_anomalies = self._detect_error_patterns(df)
            anomalies.extend(error_anomalies)
            
        except Exception as e:
            logger.error(f"Error in pattern anomaly detection: {str(e)}")
        
        return anomalies
    
    def _detect_scanning_patterns(self, df: pd.DataFrame) -> List[Dict]:
        """Detect potential port/directory scanning patterns"""
        anomalies = []
        
        # Look for IPs accessing many different URLs with 404s
        scanning_threshold = 10  # Number of 404s that might indicate scanning
        
        ip_404_counts = df[df['status_code'] == 404].groupby('src_ip').size()
        potential_scanners = ip_404_counts[ip_404_counts >= scanning_threshold]
        
        for ip, count in potential_scanners.items():
            scanner_entries = df[(df['src_ip'] == ip) & (df['status_code'] == 404)]
            
            # Check if URLs are diverse (indicating scanning)
            unique_urls = scanner_entries['url'].nunique()
            if unique_urls >= scanning_threshold * 0.8:  # Most 404s are different URLs
                confidence = min(count / 50, 1.0)  # Scale confidence
                
                for _, entry in scanner_entries.iterrows():
                    anomalies.append({
                        'entry_id': entry['id'],
                        'anomaly_type': 'pattern',
                        'reason': f"Potential scanning activity: {count} 404 errors from {ip} across {unique_urls} different URLs",
                        'confidence': confidence,
                        'severity': 'high' if count > 50 else 'medium',
                        'model_used': 'pattern_analysis',
                        'feature_contributions': {
                            'total_404s': int(count),
                            'unique_urls': int(unique_urls),
                            'scanning_ratio': float(unique_urls / count)
                        }
                    })
        
        return anomalies
    
    def _detect_injection_patterns(self, df: pd.DataFrame) -> List[Dict]:
        """Detect potential injection attack patterns"""
        anomalies = []
        
        # Common injection patterns
        injection_patterns = [
            (r'union\s+select', 'SQL injection'),
            (r'<script', 'XSS attempt'),
            (r'javascript:', 'JavaScript injection'),
            (r'\.\./.*\.\./.*\.\./', 'Path traversal'),
            (r'exec\s*\(', 'Code execution attempt'),
            (r'eval\s*\(', 'Code evaluation attempt')
        ]
        
        for pattern, attack_type in injection_patterns:
            matches = df[df['url'].str.contains(pattern, case=False, na=False)]
            
            for _, entry in matches.iterrows():
                anomalies.append({
                    'entry_id': entry['id'],
                    'anomaly_type': 'pattern',
                    'reason': f"Potential {attack_type} detected in URL",
                    'confidence': 0.8,  # High confidence for pattern matches
                    'severity': 'high',
                    'model_used': 'pattern_matching',
                    'feature_contributions': {
                        'attack_type': attack_type,
                        'matched_pattern': pattern,
                        'url': entry['url'][:100]  # Truncate for storage
                    }
                })
        
        return anomalies
    
    def _detect_error_patterns(self, df: pd.DataFrame) -> List[Dict]:
        """Detect unusual error rate patterns"""
        anomalies = []
        
        # Group by IP and calculate error rates
        ip_stats = df.groupby('src_ip').agg({
            'status_code': ['count', lambda x: (x >= 400).sum()]
        }).reset_index()
        
        ip_stats.columns = ['src_ip', 'total_requests', 'error_requests']
        ip_stats['error_rate'] = ip_stats['error_requests'] / ip_stats['total_requests']
        
        # Find IPs with unusually high error rates
        high_error_ips = ip_stats[
            (ip_stats['error_rate'] > 0.5) & 
            (ip_stats['total_requests'] >= 5)
        ]
        
        for _, ip_stat in high_error_ips.iterrows():
            ip_entries = df[df['src_ip'] == ip_stat['src_ip']]
            error_entries = ip_entries[ip_entries['status_code'] >= 400]
            
            confidence = min(ip_stat['error_rate'], 1.0)
            
            for _, entry in error_entries.iterrows():
                anomalies.append({
                    'entry_id': entry['id'],
                    'anomaly_type': 'pattern',
                    'reason': f"High error rate: {ip_stat['error_rate']:.1%} errors from {ip_stat['src_ip']} ({ip_stat['error_requests']}/{ip_stat['total_requests']})",
                    'confidence': confidence,
                    'severity': self._calculate_severity(confidence),
                    'model_used': 'statistical_analysis',
                    'feature_contributions': {
                        'error_rate': float(ip_stat['error_rate']),
                        'total_requests': int(ip_stat['total_requests']),
                        'error_requests': int(ip_stat['error_requests'])
                    }
                })
        
        return anomalies
    
    def _calculate_severity(self, confidence: float, additional_factor: Optional[float] = None) -> str:
        """Calculate severity level based on confidence and optional additional factors"""
        if additional_factor is not None:
            # Incorporate additional factors (like request count)
            severity_score = confidence * 0.7 + min(additional_factor / 100, 0.3)
        else:
            severity_score = confidence
        
        if severity_score >= 0.8:
            return 'critical'
        elif severity_score >= 0.6:
            return 'high'
        elif severity_score >= 0.4:
            return 'medium'
        else:
            return 'low'
    
    def _store_anomalies(self, log_id: str, anomalies: List[Dict]):
        """Store detected anomalies in the database"""
        try:
            anomaly_objects = []
            
            for anomaly_data in anomalies:
                anomaly = Anomaly(
                    log_id=log_id,
                    entry_id=anomaly_data['entry_id'],
                    anomaly_type=anomaly_data['anomaly_type'],
                    reason=anomaly_data['reason'],
                    confidence=anomaly_data['confidence'],
                    severity=anomaly_data['severity'],
                    model_used=anomaly_data['model_used'],
                    feature_contributions=anomaly_data.get('feature_contributions'),
                    context_window_start=anomaly_data.get('context_window_start'),
                    context_window_end=anomaly_data.get('context_window_end'),
                    related_entries_count=anomaly_data.get('related_entries_count')
                )
                anomaly_objects.append(anomaly)
            
            # Batch insert
            db.session.bulk_save_objects(anomaly_objects)
            db.session.commit()
            
            logger.info(f"Stored {len(anomaly_objects)} anomalies for log {log_id}")
            
        except Exception as e:
            logger.error(f"Error storing anomalies: {str(e)}")
            db.session.rollback()
            raise 