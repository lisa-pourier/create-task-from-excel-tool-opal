import {storage, ValueHash} from '../../store';

interface FormState extends ValueHash {
  defaultSection?: string;
}

/**
 * Helper functions for managing form state.
 */
export namespace Form {
  const formStateKey = '$formState';

  export async function setDefaultSection(defaultSection: string): Promise<void> {
    await storage.settings.patch(formStateKey, {defaultSection});
  }

  export async function clearDefaultSection(): Promise<void> {
    await storage.settings.delete(formStateKey, ['defaultSection']);
  }

  export async function getDefaultSection(): Promise<string | undefined> {
    return (await storage.settings.get<FormState>(formStateKey)).defaultSection;
  }
}
