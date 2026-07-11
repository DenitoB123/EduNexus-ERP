import { BadRequestException, ValidationError, ValidationPipe, ValidationPipeOptions } from '@nestjs/common';

function flattenValidationErrors(errors: ValidationError[], parentPath = ''): string[] {
  return errors.flatMap((error) => {
    const propertyPath = parentPath ? `${parentPath}.${error.property}` : error.property;
    const ownMessages = error.constraints ? Object.values(error.constraints) : [];
    const ownErrors = ownMessages.map((msg) => `${propertyPath}: ${msg}`);

    const childErrors = error.children?.length
      ? flattenValidationErrors(error.children, propertyPath)
      : [];

    return [...ownErrors, ...childErrors];
  });
}

export function createValidationPipeOptions(): ValidationPipeOptions {
  return {
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    exceptionFactory: (errors: ValidationError[]) => {
      const messages = flattenValidationErrors(errors);
      return new BadRequestException({
        message: 'Validation failed',
        details: messages,
      });
    },
  };
}

export function createGlobalValidationPipe(): ValidationPipe {
  return new ValidationPipe(createValidationPipeOptions());
}
