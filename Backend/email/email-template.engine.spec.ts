import { EmailTemplateEngine } from './email-template.engine';

describe('EmailTemplateEngine', () => {
  it('renders a template with the given context', () => {
    const engine = new EmailTemplateEngine();
    const html = engine.render('<p>Hello {{name}}</p>', { name: 'Ada' });
    expect(html).toBe('<p>Hello Ada</p>');
  });

  it('caches compiled templates between renders', () => {
    const engine = new EmailTemplateEngine();
    engine.render('<p>{{a}}</p>', { a: '1' });
    engine.render('<p>{{a}}</p>', { a: '2' });
    expect((engine as unknown as { compiledCache: Map<string, unknown> }).compiledCache.size).toBe(1);
  });
});
