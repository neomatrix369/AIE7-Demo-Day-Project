import logging

def setup_logging(name: str = None) -> logging.Logger:
    """
    Initialize consistent logging configuration with third-party noise suppression.

    **🎯 PURPOSE:**
    - Creates standardized logger for module with consistent formatting
    - Automatically suppresses verbose third-party library logging
    - Provides clean, focused log output for development and production

    **🔧 CONFIGURATION APPLIED:**
    - **Level**: INFO for application code, WARNING for third-party libraries
    - **Format**: Timestamp - Module - Level - Message
    - **Idempotent**: Safe to call multiple times without conflicts
    - **Named Logger**: Returns logger specific to calling module

    Args:
        name (str, optional): Logger name, typically __name__ from calling module
                             If None, uses the current module's name

    Returns:
        logging.Logger: Configured logger instance ready for use

    **💡 TYPICAL USAGE:**
    ```python
    from src.utils.logging_config import setup_logging
    logger = setup_logging(__name__)
    logger.info("📊 Processing started")
    logger.warning("⚠️ Potential issue detected")
    ```

    **⚡ PERFORMANCE NOTES:**
    - Minimal overhead after initial setup
    - Third-party suppression improves log readability
    - Named loggers enable module-specific filtering if needed
    """
    # Configure basic logging (idempotent - won't duplicate if already configured)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        force=False,  # Don't override existing configuration
    )

    # Suppress verbose logging from third-party libraries
    third_party_loggers = [
        "httpx",
        "httpcore",
        "openai",
        "urllib3",
        "requests",
        "uvicorn",
        "uvicorn.access",
        "langchain",
        "langchain_core",
        "langchain_openai",
        "langchain_community",
        "qdrant_client",
        "cohere",
        "tavily",
        "asyncio",
        "aiohttp",
        "charset_normalizer",
        "multipart",
        "starlette",
        "fastapi",
    ]

    for logger_name in third_party_loggers:
        logging.getLogger(logger_name).setLevel(logging.WARNING)

    # Create and return logger
    return logging.getLogger(name or __name__)