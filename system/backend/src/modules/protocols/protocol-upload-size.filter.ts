import { ArgumentsHost, Catch, ExceptionFilter, PayloadTooLargeException } from '@nestjs/common';
import type { Response } from 'express';

@Catch(PayloadTooLargeException)
export class ProtocolUploadSizeExceptionFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost) {
    host.switchToHttp().getResponse<Response>().status(413).json({
      statusCode: 413,
      message: 'File is too large. Protocol attachments must be 10 MB or smaller.',
    });
  }
}

