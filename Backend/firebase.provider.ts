import * as admin from 'firebase-admin';
import { IPushProvider, SendPushInput } from '../interfaces/notification.interface';

export interface FirebaseProviderConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * Lazily initializes the Firebase Admin SDK on first send() rather
 * than at construction time. EduNexus has no business module that
 * sends push notifications yet, so Firebase credentials are commonly
 * unset in most environments — eager initialization would throw on
 * application bootstrap the moment this (globally-registered)
 * provider is constructed.
 */
export class FirebaseProvider implements IPushProvider {
  private app: admin.app.App | undefined;

  constructor(private readonly config: FirebaseProviderConfig) {}

  private getApp(): admin.app.App {
    if (this.app) return this.app;

    if (!this.config.projectId || !this.config.clientEmail || !this.config.privateKey) {
      throw new Error(
        'Push notifications are not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.',
      );
    }

    this.app = admin.apps.length
      ? (admin.apps[0] as admin.app.App)
      : admin.initializeApp({
          credential: admin.credential.cert({
            projectId: this.config.projectId,
            clientEmail: this.config.clientEmail,
            privateKey: this.config.privateKey,
          }),
        });

    return this.app;
  }

  async send(input: SendPushInput): Promise<void> {
    if (input.deviceTokens.length === 0) return;

    await admin.messaging(this.getApp()).sendEachForMulticast({
      tokens: input.deviceTokens,
      notification: { title: input.title, body: input.body },
      data: input.data,
    });
  }
}
