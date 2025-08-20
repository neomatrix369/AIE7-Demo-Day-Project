# -*- coding: utf-8 -*-
"""
Error Response Service

Provides standardized error response formats across all API endpoints.
Ensures consistent error handling and improves API usability.

Following the Four Rules of Simple Design:
1. Tests pass - Maintains exact same error information 
2. Reveals intent - Clear error response structure
3. No duplication - Single error format pattern
4. Fewest elements - Minimal, consistent interface
"""

import logging
from typing import Dict, Any, Optional
from enum import Enum

logger = logging.getLogger(__name__)


class ErrorType(Enum):
    """Standard error types for consistent categorization."""
    VALIDATION_ERROR = "validation_error"
    NOT_FOUND = "not_found"
    INTERNAL_ERROR = "internal_error"
    SERVICE_UNAVAILABLE = "service_unavailable"
    PERMISSION_DENIED = "permission_denied"
    RESOURCE_CONFLICT = "resource_conflict"


class ErrorResponseService:
    """Service for creating standardized error responses."""
    
    @staticmethod
    def create_error_response(
        success: bool = False,
        error_type: ErrorType = ErrorType.INTERNAL_ERROR,
        message: str = "An error occurred",
        details: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a standardized error response.
        
        Args:
            success: Always False for error responses
            error_type: Type of error for categorization
            message: User-friendly error message
            details: Technical details (optional)
            data: Additional error data (optional)
            
        Returns:
            Standardized error response dictionary
        """
        response = {
            "success": success,
            "error": {
                "type": error_type.value,
                "message": message
            }
        }
        
        if details:
            response["error"]["details"] = details
            
        if data:
            response["data"] = data
            
        return response
    
    @staticmethod
    def create_success_response(
        message: str = "Operation completed successfully",
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a standardized success response.
        
        Args:
            message: Success message
            data: Response data (optional)
            
        Returns:
            Standardized success response dictionary
        """
        response = {
            "success": True,
            "message": message
        }
        
        if data:
            response["data"] = data
            
        return response
    
    @staticmethod
    def validation_error(message: str, details: Optional[str] = None) -> Dict[str, Any]:
        """Create validation error response."""
        return ErrorResponseService.create_error_response(
            error_type=ErrorType.VALIDATION_ERROR,
            message=message,
            details=details
        )
    
    @staticmethod
    def not_found_error(resource: str, identifier: str = "") -> Dict[str, Any]:
        """Create not found error response."""
        message = f"{resource} not found"
        if identifier:
            message += f": {identifier}"
            
        return ErrorResponseService.create_error_response(
            error_type=ErrorType.NOT_FOUND,
            message=message
        )
    
    @staticmethod
    def internal_error(message: str = "Internal server error", details: Optional[str] = None) -> Dict[str, Any]:
        """Create internal server error response."""
        return ErrorResponseService.create_error_response(
            error_type=ErrorType.INTERNAL_ERROR,
            message=message,
            details=details
        )
    
    @staticmethod
    def service_unavailable_error(service: str, details: Optional[str] = None) -> Dict[str, Any]:
        """Create service unavailable error response."""
        return ErrorResponseService.create_error_response(
            error_type=ErrorType.SERVICE_UNAVAILABLE,
            message=f"{service} is currently unavailable",
            details=details
        )
    
    @staticmethod
    def log_and_return_error(
        error: Exception,
        context: str,
        error_type: ErrorType = ErrorType.INTERNAL_ERROR,
        user_message: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Log error and return standardized error response.
        
        Args:
            error: The exception that occurred
            context: Context where error occurred (e.g., "Failed to load experiments")
            error_type: Type of error
            user_message: Custom user-friendly message (optional)
            
        Returns:
            Standardized error response
        """
        # Log the error with context
        logger.error(f"❌ {context}: {str(error)}")
        
        # Use provided user message or generate from context
        message = user_message or context
        
        return ErrorResponseService.create_error_response(
            error_type=error_type,
            message=message,
            details=str(error)
        )