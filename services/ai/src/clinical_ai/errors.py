class GatewayTimeoutException(Exception):
    status_code = 504

    def __init__(self, message: str):
        super().__init__(message)
        self.detail = message


class ServiceUnavailableException(Exception):
    status_code = 503

    def __init__(self, message: str):
        super().__init__(message)
        self.detail = message
