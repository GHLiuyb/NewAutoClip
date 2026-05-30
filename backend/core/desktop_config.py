"""Desktop runtime configuration compatibility layer.

This module keeps desktop-oriented settings endpoints importable after the
desktop-specific configuration implementation was removed. Desktop paths are
resolved through the shared path helpers so packaged builds use the app support
directory while development builds can keep using the project workspace.
"""

import os
import shutil
from copy import deepcopy
from dataclasses import dataclass
from pathlib import Path

from . import path_utils
from .config import settings


@dataclass
class DesktopPaths:
    data_dir: Path
    cache_dir: Path
    temp_dir: Path
    database_url: str


@dataclass
class WhisperConfig:
    model_name: str = "base"
    language: str = "auto"
    custom_models_dir: str = ""
    enable_timestamps: bool = True
    enable_punctuation: bool = True
    enable_speaker_diarization: bool = False
    timeout: int = 1800


@dataclass
class ApiConfig:
    api_key: str = ""
    region: str = ""
    endpoint: str = ""
    language: str = "auto"
    enable_timestamps: bool = True
    enable_punctuation: bool = True


@dataclass
class SpeechRecognitionSettings:
    method: str = "whisper_local"
    whisper_config: WhisperConfig = None
    openai_config: ApiConfig = None
    azure_config: ApiConfig = None
    google_config: ApiConfig = None
    aliyun_config: ApiConfig = None
    custom_api_config: ApiConfig = None
    enable_fallback: bool = True
    fallback_method: str = "whisper_local"
    output_format: str = "srt"

    def __post_init__(self):
        self.whisper_config = self.whisper_config or WhisperConfig()
        self.openai_config = self.openai_config or ApiConfig()
        self.azure_config = self.azure_config or ApiConfig()
        self.google_config = self.google_config or ApiConfig()
        self.aliyun_config = self.aliyun_config or ApiConfig()
        self.custom_api_config = self.custom_api_config or ApiConfig()

    def copy(self):
        return deepcopy(self)


class DesktopConfig:
    def __init__(self):
        self.settings = settings
        self.paths = self._build_paths()
        self.speech_recognition = SpeechRecognitionSettings()
        self._openai_api_key = os.getenv("API_OPENAI_API_KEY", "")
        self._gemini_api_key = os.getenv("API_GEMINI_API_KEY", "")
        self._siliconflow_api_key = os.getenv("API_SILICONFLOW_API_KEY", "")
        self._jimeng_access_key = os.getenv("API_JIMENG_ACCESS_KEY", "")
        self._jimeng_secret_key = os.getenv("API_JIMENG_SECRET_KEY", "")
        self._max_memory_usage = int(os.getenv("AUTOCLIP_MAX_MEMORY_USAGE", "2048"))
        self._log_retention_days = int(os.getenv("AUTOCLIP_LOG_RETENTION_DAYS", "7"))
        self._current_provider = os.getenv("AUTOCLIP_DEFAULT_PROVIDER", "dashscope")
        # 从配置文件加载设置
        self._load_from_file()

    def _build_paths(self) -> DesktopPaths:
        data_dir = path_utils.get_data_directory()
        cache_dir = path_utils.get_cache_directory()
        temp_dir = path_utils.get_temp_directory()
        return DesktopPaths(
            data_dir=data_dir,
            cache_dir=cache_dir,
            temp_dir=temp_dir,
            database_url=f"sqlite:///{data_dir / 'autoclip.db'}",
        )

    def _load_from_file(self):
        """从配置文件加载设置"""
        import json
        settings_file = self.paths.data_dir / "settings.json"
        if settings_file.exists():
            try:
                with open(settings_file, 'r', encoding='utf-8') as f:
                    saved_settings = json.load(f)

                # 支持两种格式：嵌套格式（api.api_provider）和扁平格式（llm_provider）
                if 'api' in saved_settings:
                    # 嵌套格式（DesktopSettings 格式）
                    api_config = saved_settings['api']
                    if 'api_keys' in api_config:
                        self._openai_api_key = api_config['api_keys'].get('openai', '')
                        self._gemini_api_key = api_config['api_keys'].get('gemini', '')
                        self._siliconflow_api_key = api_config['api_keys'].get('siliconflow', '')
                        self._jimeng_access_key = api_config['api_keys'].get('jimeng_access', '')
                        self._jimeng_secret_key = api_config['api_keys'].get('jimeng_secret', '')
                        sensenova_key = api_config['api_keys'].get('sensenova', '')
                        if sensenova_key:
                            os.environ['API_SENSENOVA_API_KEY'] = sensenova_key
                        if 'dashscope' in api_config['api_keys']:
                            self.settings.api_dashscope_api_key = api_config['api_keys']['dashscope']
                    if 'api_provider' in api_config:
                        self._current_provider = api_config['api_provider']
                    if 'api_model' in api_config:
                        self.settings.api_model_name = api_config['api_model']
                    if 'api_max_tokens' in api_config:
                        self.settings.api_max_tokens = api_config['api_max_tokens']
                    if 'api_timeout' in api_config:
                        self.settings.api_timeout = api_config['api_timeout']
                elif 'llm_provider' in saved_settings:
                    # 扁平格式（LLMManager/ConfigManager 格式）
                    self._current_provider = saved_settings.get('llm_provider', 'dashscope')
                    self.settings.api_model_name = saved_settings.get('model_name', 'qwen-plus')
                    # API keys
                    self.settings.api_dashscope_api_key = saved_settings.get('dashscope_api_key', '')
                    self._openai_api_key = saved_settings.get('openai_api_key', '')
                    self._gemini_api_key = saved_settings.get('gemini_api_key', '')
                    self._siliconflow_api_key = saved_settings.get('siliconflow_api_key', '')
                    sensenova_key = saved_settings.get('sensenova_api_key', '')
                    if sensenova_key:
                        os.environ['API_SENSENOVA_API_KEY'] = sensenova_key
                    self._jimeng_access_key = saved_settings.get('jimeng_access_key', '')
                    self._jimeng_secret_key = saved_settings.get('jimeng_secret_key', '')
                    # 处理设置
                    if 'chunk_size' in saved_settings:
                        self.settings.processing_chunk_size = saved_settings['chunk_size']
                    if 'min_score_threshold' in saved_settings:
                        self.settings.processing_min_score_threshold = saved_settings['min_score_threshold']
                    if 'max_clips_per_collection' in saved_settings:
                        self.settings.processing_max_clips_per_collection = saved_settings['max_clips_per_collection']

                # 加载处理设置（嵌套格式）
                if 'processing' in saved_settings:
                    proc_config = saved_settings['processing']
                    if 'processing_chunk_size' in proc_config:
                        self.settings.processing_chunk_size = proc_config['processing_chunk_size']
                    # 兼容新旧字段名
                    if 'processing_min_score' in proc_config:
                        self.settings.processing_min_score_threshold = proc_config['processing_min_score']
                    elif 'processing_min_score_threshold' in proc_config:
                        self.settings.processing_min_score_threshold = proc_config['processing_min_score_threshold']
                    if 'processing_max_clips' in proc_config:
                        self.settings.processing_max_clips_per_collection = proc_config['processing_max_clips']
                    elif 'processing_max_clips_per_collection' in proc_config:
                        self.settings.processing_max_clips_per_collection = proc_config['processing_max_clips_per_collection']
                    if 'processing_max_retries' in proc_config:
                        self.settings.processing_max_retries = proc_config['processing_max_retries']

                # 加载日志设置
                if 'logs' in saved_settings:
                    logs_config = saved_settings['logs']
                    if 'log_level' in logs_config:
                        self.settings.log_level = logs_config['log_level']
                    if 'log_retention_days' in logs_config:
                        self._log_retention_days = logs_config['log_retention_days']

                # 加载服务设置
                if 'service' in saved_settings:
                    service_config = saved_settings['service']
                    if 'max_memory_usage' in service_config:
                        self._max_memory_usage = service_config['max_memory_usage']

            except Exception as e:
                print(f"加载配置文件失败: {e}")

    def _save_to_file(self):
        """保存配置到文件"""
        import json
        settings_file = self.paths.data_dir / "settings.json"
        try:
            # 确保目录存在
            settings_file.parent.mkdir(parents=True, exist_ok=True)
            
            # 构建要保存的配置
            config_dict = {
                'basic': {
                    'app_name': self.app_name,
                    'app_version': self.app_version,
                    'debug_mode': self.debug_mode,
                    'auto_start': True
                },
                'service': {
                    'host': self.host,
                    'port': self.port,
                    'max_memory_usage': self._max_memory_usage
                },
                'api': {
                    'api_keys': {
                        'dashscope': self.settings.api_dashscope_api_key,
                        'openai': self._openai_api_key,
                        'gemini': self._gemini_api_key,
                        'siliconflow': self._siliconflow_api_key,
                        'sensenova': os.getenv('API_SENSENOVA_API_KEY', ''),
                        'jimeng_access': self._jimeng_access_key,
                        'jimeng_secret': self._jimeng_secret_key
                    },
                    'api_provider': self._current_provider,
                    'api_model': self.settings.api_model_name,
                    'api_max_tokens': self.settings.api_max_tokens,
                    'api_timeout': self.settings.api_timeout
                },
                'processing': {
                    'processing_chunk_size': self.settings.processing_chunk_size,
                    'processing_min_score': self.settings.processing_min_score_threshold,
                    'processing_max_clips': self.settings.processing_max_clips_per_collection,
                    'processing_max_retries': self.settings.processing_max_retries
                },
                'logs': {
                    'log_level': self.settings.log_level,
                    'log_retention_days': self._log_retention_days
                },
                'paths': {
                    'data_directory': str(self.paths.data_dir),
                    'cache_directory': str(self.paths.cache_dir),
                    'temp_directory': str(self.paths.temp_dir)
                }
            }
            
            with open(settings_file, 'w', encoding='utf-8') as f:
                json.dump(config_dict, f, indent=2, ensure_ascii=False)
            
            print(f"配置已保存到: {settings_file}")
            return True
        except Exception as e:
            print(f"保存配置文件失败: {e}")
            return False

    def set_data_dir(self, new_data_dir: Path, migrate_from_old: bool = True):
        new_data_dir = new_data_dir.expanduser().resolve()
        old_data_dir = self.paths.data_dir
        new_data_dir.mkdir(parents=True, exist_ok=True)

        migrated = False
        if migrate_from_old and old_data_dir.exists() and old_data_dir != new_data_dir:
            for item in old_data_dir.iterdir():
                target = new_data_dir / item.name
                if target.exists():
                    continue
                if item.is_dir():
                    shutil.copytree(item, target)
                else:
                    shutil.copy2(item, target)
            migrated = True

        os.environ["AUTOCLIP_DATA_DIR"] = str(new_data_dir)
        self.paths = DesktopPaths(
            data_dir=new_data_dir,
            cache_dir=new_data_dir / "cache",
            temp_dir=new_data_dir / "temp",
            database_url=f"sqlite:///{new_data_dir / 'autoclip.db'}",
        )
        self.paths.cache_dir.mkdir(parents=True, exist_ok=True)
        self.paths.temp_dir.mkdir(parents=True, exist_ok=True)
        return {"data_dir": str(new_data_dir), "migrated": migrated}

    def validate_config(self):
        errors = []
        warnings = []
        for directory in (self.paths.data_dir, self.paths.cache_dir, self.paths.temp_dir):
            try:
                directory.mkdir(parents=True, exist_ok=True)
            except Exception as exc:
                errors.append(f"目录不可用: {directory} ({exc})")
        if not self.settings.api_dashscope_api_key:
            warnings.append("未配置 DashScope API Key")
        return {"valid": not errors, "errors": errors, "warnings": warnings}

    def dict(self):
        return {
            "app_name": self.app_name,
            "app_version": self.app_version,
            "debug_mode": self.debug_mode,
            "host": self.host,
            "port": self.port,
            "log_level": self.log_level,
            "paths": {
                "data_dir": str(self.paths.data_dir),
                "cache_dir": str(self.paths.cache_dir),
                "temp_dir": str(self.paths.temp_dir),
                "database_url": self.paths.database_url,
            },
        }

    @property
    def app_name(self) -> str:
        return "AutoClip"

    @property
    def app_version(self) -> str:
        return "1.0.0"

    @property
    def debug_mode(self) -> bool:
        return self.settings.debug

    @debug_mode.setter
    def debug_mode(self, value: bool) -> None:
        self.settings.debug = value

    @property
    def host(self) -> str:
        return os.getenv("AUTOCLIP_HOST", "127.0.0.1")

    @host.setter
    def host(self, value: str) -> None:
        os.environ["AUTOCLIP_HOST"] = value

    @property
    def port(self) -> int:
        return int(os.getenv("AUTOCLIP_PORT", "8000"))

    @port.setter
    def port(self, value: int) -> None:
        os.environ["AUTOCLIP_PORT"] = str(value)

    @property
    def log_level(self) -> str:
        return self.settings.log_level

    @log_level.setter
    def log_level(self, value: str) -> None:
        self.settings.log_level = value

    @property
    def celery_worker_concurrency(self) -> int:
        return int(os.getenv("AUTOCLIP_CELERY_WORKER_CONCURRENCY", "1"))

    @property
    def max_memory_usage(self) -> int:
        return self._max_memory_usage

    @max_memory_usage.setter
    def max_memory_usage(self, value: int) -> None:
        self._max_memory_usage = value

    @property
    def dashscope_api_key(self) -> str:
        return self.settings.api_dashscope_api_key

    @dashscope_api_key.setter
    def dashscope_api_key(self, value: str) -> None:
        self.settings.api_dashscope_api_key = value

    @property
    def openai_api_key(self) -> str:
        return self._openai_api_key

    @openai_api_key.setter
    def openai_api_key(self, value: str) -> None:
        self._openai_api_key = value

    @property
    def gemini_api_key(self) -> str:
        return self._gemini_api_key

    @gemini_api_key.setter
    def gemini_api_key(self, value: str) -> None:
        self._gemini_api_key = value

    @property
    def siliconflow_api_key(self) -> str:
        return self._siliconflow_api_key

    @siliconflow_api_key.setter
    def siliconflow_api_key(self, value: str) -> None:
        self._siliconflow_api_key = value

    @property
    def jimeng_access_key(self) -> str:
        return self._jimeng_access_key

    @jimeng_access_key.setter
    def jimeng_access_key(self, value: str) -> None:
        self._jimeng_access_key = value

    @property
    def jimeng_secret_key(self) -> str:
        return self._jimeng_secret_key

    @jimeng_secret_key.setter
    def jimeng_secret_key(self, value: str) -> None:
        self._jimeng_secret_key = value

    @property
    def sensenova_api_key(self) -> str:
        return os.getenv("API_SENSENOVA_API_KEY", "")

    @sensenova_api_key.setter
    def sensenova_api_key(self, value: str) -> None:
        os.environ["API_SENSENOVA_API_KEY"] = value

    @property
    def default_model(self) -> str:
        return self.settings.api_model_name

    @default_model.setter
    def default_model(self, value: str) -> None:
        self.settings.api_model_name = value

    @property
    def current_provider(self) -> str:
        return self._current_provider

    @current_provider.setter
    def current_provider(self, value: str) -> None:
        self._current_provider = value

    @property
    def max_tokens(self) -> int:
        return self.settings.api_max_tokens

    @max_tokens.setter
    def max_tokens(self, value: int) -> None:
        self.settings.api_max_tokens = value

    @property
    def timeout(self) -> int:
        return self.settings.api_timeout

    @timeout.setter
    def timeout(self, value: int) -> None:
        self.settings.api_timeout = value

    @property
    def chunk_size(self) -> int:
        return self.settings.processing_chunk_size

    @chunk_size.setter
    def chunk_size(self, value: int) -> None:
        self.settings.processing_chunk_size = value

    @property
    def min_score_threshold(self) -> float:
        return self.settings.processing_min_score_threshold

    @min_score_threshold.setter
    def min_score_threshold(self, value: float) -> None:
        self.settings.processing_min_score_threshold = value

    @property
    def max_clips_per_collection(self) -> int:
        return self.settings.processing_max_clips_per_collection

    @max_clips_per_collection.setter
    def max_clips_per_collection(self, value: int) -> None:
        self.settings.processing_max_clips_per_collection = value

    @property
    def max_retries(self) -> int:
        return self.settings.processing_max_retries

    @max_retries.setter
    def max_retries(self, value: int) -> None:
        self.settings.processing_max_retries = value

    @property
    def log_retention_days(self) -> int:
        return self._log_retention_days

    @log_retention_days.setter
    def log_retention_days(self, value: int) -> None:
        self._log_retention_days = value


_desktop_config = DesktopConfig()


def is_desktop_mode() -> bool:
    return path_utils.is_desktop_mode()


def get_desktop_config() -> DesktopConfig:
    return _desktop_config


def get_desktop_paths() -> DesktopPaths:
    return _desktop_config.paths


def get_desktop_data_dir() -> Path:
    return _desktop_config.paths.data_dir


def ensure_desktop_directories() -> bool:
    try:
        for directory in (
            _desktop_config.paths.data_dir,
            _desktop_config.paths.cache_dir,
            _desktop_config.paths.temp_dir,
            _desktop_config.paths.data_dir / "logs",
        ):
            directory.mkdir(parents=True, exist_ok=True)
        return True
    except Exception:
        return False


def save_desktop_config(config: DesktopConfig) -> bool:
    return config._save_to_file()
