import { FileSecurityService } from './file-security.service';

describe('FileSecurityService', () => {
  const service = new FileSecurityService();

  it('allows permitted MIME types', () => {
    expect(service.isMimeTypeAllowed('image/jpeg')).toBe(true);
    expect(service.isMimeTypeAllowed('application/pdf')).toBe(true);
  });

  it('rejects unlisted MIME types', () => {
    expect(service.isMimeTypeAllowed('application/x-executable')).toBe(false);
  });

  it('rejects dangerous file extensions', () => {
    expect(service.isExtensionSafe('virus.exe')).toBe(false);
    expect(service.isExtensionSafe('shell.sh')).toBe(false);
    expect(service.isExtensionSafe('page.php')).toBe(false);
  });

  it('allows safe file extensions', () => {
    expect(service.isExtensionSafe('report.pdf')).toBe(true);
    expect(service.isExtensionSafe('photo.jpg')).toBe(true);
  });

  it('rejects files exceeding the size limit', () => {
    expect(service.isSizeAllowed(30 * 1024 * 1024)).toBe(false);
    expect(service.isSizeAllowed(5 * 1024 * 1024)).toBe(true);
  });

  it('validate() returns all errors for an invalid file', () => {
    const { valid, errors } = service.validate('trojan.exe', 'application/x-executable', 50 * 1024 * 1024);
    expect(valid).toBe(false);
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });

  it('validate() returns valid=true for a clean PDF upload', () => {
    const { valid, errors } = service.validate('report.pdf', 'application/pdf', 1024 * 1024);
    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
  });
});
