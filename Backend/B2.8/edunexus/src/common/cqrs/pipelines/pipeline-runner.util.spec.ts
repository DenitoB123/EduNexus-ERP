import { PipelineRunner } from './pipeline-runner.util';
import { BaseCommand } from '../commands/base.command';
import { ICqrsExecutionContext } from '../interfaces/cqrs-context.interface';
import { ICommandPipelineBehavior } from '../interfaces/pipeline.interface';

class TestCommand extends BaseCommand {}
const context: ICqrsExecutionContext = { correlationId: 'corr-1' };

describe('PipelineRunner.runCommandPipeline', () => {
  it('calls the terminal function directly when there are no behaviors', async () => {
    const terminal = jest.fn().mockResolvedValue('done');

    const result = await PipelineRunner.runCommandPipeline([], new TestCommand(), context, terminal);

    expect(result).toBe('done');
    expect(terminal).toHaveBeenCalledTimes(1);
  });

  it('short-circuits when a behavior throws without calling next()', async () => {
    const terminal = jest.fn().mockResolvedValue('done');
    const failing: ICommandPipelineBehavior = {
      name: 'failing',
      handle: async () => {
        throw new Error('blocked');
      },
    };

    await expect(
      PipelineRunner.runCommandPipeline([failing], new TestCommand(), context, terminal),
    ).rejects.toThrow('blocked');
    expect(terminal).not.toHaveBeenCalled();
  });
});
