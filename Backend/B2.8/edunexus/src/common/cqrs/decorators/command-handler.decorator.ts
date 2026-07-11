import { SetMetadata } from '@nestjs/common';
import { CommandType, ICommand } from '../interfaces/command.interface';
import { COMMAND_HANDLER_METADATA } from '../constants/cqrs.constants';

/**
 * Class decorator that registers a provider as the handler for a
 * given command class. Mirrors the metadata-decorator convention
 * already used throughout this codebase (`@Public()`, `@OnEvent()`,
 * `@RequirePermissions()`), so it's discovered the same way — via
 * `Reflector` + `DiscoveryModule` — rather than a bespoke registration
 * API.
 *
 * @example
 * @CommandHandler(CreateStudentCommand)
 * export class CreateStudentHandler extends CommandHandlerBase<CreateStudentCommand, StudentDto> {
 *   async execute(command: CreateStudentCommand, context: ICqrsExecutionContext) { ... }
 * }
 */
export const CommandHandler = (command: CommandType<ICommand>): ClassDecorator =>
  SetMetadata(COMMAND_HANDLER_METADATA, command);
