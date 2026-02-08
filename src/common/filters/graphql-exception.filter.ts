import { Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GqlExceptionFilter, GqlArgumentsHost } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

@Catch()
export class GraphQLExceptionFilter implements GqlExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const gqlHost = GqlArgumentsHost.create(host);
    const ctx = gqlHost.getContext();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';
    let extensions: Record<string, any> = {};

    // Handle HTTP exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'object' && response !== null) {
        message = (response as any).message || message;
        extensions = { ...(response as any) };
      } else {
        message = response as string;
      }

      // Map HTTP status to GraphQL error codes
      code = this.getErrorCode(status);
    }
    // Handle GraphQL errors
    else if (exception instanceof GraphQLError) {
      message = exception.message;
      code = (exception.extensions?.code as string) || 'GRAPHQL_ERROR';
      extensions = exception.extensions || {};
    }
    // Handle unknown errors
    else if (exception instanceof Error) {
      message = exception.message;
    }

    // Hide sensitive information in production
    if (process.env.NODE_ENV === 'production') {
      if (status >= 500) {
        message = 'Internal server error';
        extensions = {};
      }
      // Remove stack traces
      delete extensions.stacktrace;
      delete extensions.exception;
    }

    // Log error for debugging
    console.error('GraphQL Error:', {
      message,
      code,
      status,
      path: ctx?.req?.url || 'unknown',
      user: ctx?.req?.user?.id || 'anonymous',
      timestamp: new Date().toISOString(),
    });

    return new GraphQLError(message, {
      extensions: {
        code,
        status,
        ...extensions,
      },
    });
  }

  private getErrorCode(status: number): string {
    const codeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHENTICATED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      503: 'SERVICE_UNAVAILABLE',
    };

    return codeMap[status] || 'INTERNAL_SERVER_ERROR';
  }
}
