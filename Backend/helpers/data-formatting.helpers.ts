export class DataFormattingHelpers {
  static formatPhoneDisplay(e164: string): string {
    const digits = e164.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return e164;
  }

  static formatNameFull(firstName: string, lastName: string): string {
    return `${firstName.trim()} ${lastName.trim()}`.trim();
  }
}
