"""
Environment detection utilities for cloud deployment compatibility.
"""
import os
import logging

logger = logging.getLogger(__name__)

def is_cloud_deployment() -> bool:
    """
    Detect if running in a cloud deployment environment.
    
    Returns:
        bool: True if running in cloud (Railway, Vercel Functions, etc.)
    """
    # Check common cloud environment indicators
    deployment_env = os.getenv("DEPLOYMENT_ENV", "").lower()
    railway_env = os.getenv("RAILWAY_ENVIRONMENT")
    vercel_env = os.getenv("VERCEL_ENV")
    render_env = os.getenv("RENDER")
    heroku_env = os.getenv("DYNO")
    
    # Explicit deployment environment variable
    if deployment_env in ["railway", "vercel", "render", "heroku", "cloud", "production"]:
        logger.info(f"🌐 Cloud deployment detected via DEPLOYMENT_ENV: {deployment_env}")
        return True
    
    # Railway specific detection
    if railway_env:
        logger.info(f"🚂 Railway deployment detected: environment={railway_env}")
        return True
    
    # Vercel specific detection (for serverless functions)
    if vercel_env:
        logger.info(f"🔺 Vercel deployment detected: environment={vercel_env}")
        return True
    
    # Render specific detection
    if render_env:
        logger.info("🎨 Render deployment detected")
        return True
    
    # Heroku specific detection
    if heroku_env:
        logger.info("💜 Heroku deployment detected")
        return True
    
    # Check for other cloud indicators
    if os.getenv("PORT") and not os.getenv("DEVELOPMENT"):
        # Many cloud platforms set PORT but local dev usually doesn't
        logger.info("🌐 Cloud deployment detected via PORT environment variable")
        return True
    
    # Check for read-only filesystem (common in containers)
    if is_filesystem_readonly():
        logger.info("🌐 Cloud deployment detected via read-only filesystem")
        return True
    
    logger.info("🏠 Local development environment detected")
    return False

def is_railway_deployment() -> bool:
    """Check specifically for Railway deployment."""
    return os.getenv("RAILWAY_ENVIRONMENT") is not None

def is_vercel_deployment() -> bool:
    """Check specifically for Vercel deployment."""
    return os.getenv("VERCEL_ENV") is not None

def is_filesystem_readonly() -> bool:
    """
    Check if the filesystem is read-only (common in cloud containers).
    
    Returns:
        bool: True if filesystem appears to be read-only
    """
    try:
        # Try to create a temporary file in the current directory
        test_file = ".test_write_permissions"
        with open(test_file, 'w') as f:
            f.write("test")
        os.remove(test_file)
        return False
    except (OSError, IOError, PermissionError):
        return True

def get_deployment_info() -> dict:
    """
    Get comprehensive deployment environment information.
    
    Returns:
        dict: Environment information
    """
    return {
        "is_cloud": is_cloud_deployment(),
        "is_railway": is_railway_deployment(),
        "is_vercel": is_vercel_deployment(),
        "is_filesystem_readonly": is_filesystem_readonly(),
        "deployment_env": os.getenv("DEPLOYMENT_ENV", "local"),
        "platform_indicators": {
            "railway_env": os.getenv("RAILWAY_ENVIRONMENT"),
            "vercel_env": os.getenv("VERCEL_ENV"),
            "render": os.getenv("RENDER"),
            "heroku": os.getenv("DYNO"),
            "port": os.getenv("PORT")
        }
    }

def log_deployment_info():
    """Log deployment environment information for debugging."""
    info = get_deployment_info()
    logger.info("📊 Deployment Environment Information:")
    logger.info(f"   🌐 Cloud deployment: {info['is_cloud']}")
    logger.info(f"   🚂 Railway: {info['is_railway']}")
    logger.info(f"   🔺 Vercel: {info['is_vercel']}")
    logger.info(f"   📁 Filesystem readonly: {info['is_filesystem_readonly']}")
    logger.info(f"   🏷️ Deployment env: {info['deployment_env']}")