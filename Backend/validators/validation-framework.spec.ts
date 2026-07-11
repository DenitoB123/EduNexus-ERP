import { IsString } from 'class-validator';
import { IsStrongPassword, IsSlug, IsFutureDate } from './validation.decorators';
import { ValidationHelper } from './validation.helper';

class TestDto {
  @IsString()
  @IsStrongPassword()
  password!: string;

  @IsString()
  @IsSlug()
  slug!: string;

  @IsFutureDate()
  eventDate!: string;
}

describe('Custom validators', () => {
  it('passes for a valid strong password, slug, and future date', async () => {
    await expect(
      ValidationHelper.validateOrThrow(TestDto, {
        password: 'Sup3r$ecret!!',
        slug: 'my-valid-slug',
        eventDate: new Date(Date.now() + 86400000).toISOString(),
      }),
    ).resolves.toBeInstanceOf(TestDto);
  });

  it('throws ValidationException with flattened errors on failure', async () => {
    await expect(
      ValidationHelper.validateOrThrow(TestDto, {
        password: 'weak',
        slug: 'Not A Slug',
        eventDate: new Date(Date.now() - 86400000).toISOString(),
      }),
    ).rejects.toMatchObject({ message: 'Validation failed' });
  });
});
