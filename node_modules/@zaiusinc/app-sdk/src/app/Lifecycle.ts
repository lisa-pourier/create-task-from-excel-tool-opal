import {PrimitiveFormValue} from '@zaiusinc/app-forms-schema';

import {LifecycleSettingsResult, Request} from './lib';
import {AuthorizationGrantResult} from './lib/AuthorizationGrantResult';
import {LifecycleResult, CanUninstallResult} from './types';

/**
 * The format form data will be provided in when the user submits a form or performs a button action.
 * Keys will be the field key as provided in the form definition.
 */
export interface SubmittedFormData {
  [field: string]: PrimitiveFormValue | PrimitiveFormValue[];
}

/**
 * Handler for all application lifecycle events, such as install, uninstall, etc
 */
export abstract class Lifecycle {
  /**
   * Called when an app is installed, before any other lifecycle methods can be used.
   * Peform any app specific pre-requisites here before the user is able to use or configure the app.
   * @returns {LifecycleResult} e.g., {success: true} if the install was successful.
   * If false, the app will not be installed and any data stored will be deleted, however,
   * schema or other account changes are not transactional and will not be undone.
   */
  public abstract onInstall(): Promise<LifecycleResult>;

  /**
   * Handle a submission of a form section. You are responsible for performing any validation or
   * changes to the form data and then writing it to the settings store for the section.
   * @param section the name of the section submitted
   * @param action the action of the button that triggered the call, or 'save' by default
   * @param formData the data for the section as a hash of key/value pairs
   * @returns {LifecycleSettingsResult} with any errors that should be displayed to the user
   */
  public abstract onSettingsForm(
    section: string,
    action: string,
    formData: SubmittedFormData
  ): Promise<LifecycleSettingsResult>;

  /**
   * Handle an upgrade. Perform any upgrade tasks here. All actions must be idempotent
   * and backwards compatible in case of an upgrade failure. This function is called *before*
   * functions are migrated to the new version.
   * @param fromVersion the previous version of the app we are upgrading from
   * @returns {LifecycleResult} e.g., {success: true} if the upgrade was successful.
   * If false, the app will be rolled back to the fromVersion.
   */
  public abstract onUpgrade(fromVersion: string): Promise<LifecycleResult>;

  /**
   * Perform any final actions, such as registering new functions that were added to this version.
   * This function is called *after* all functions have been created and migrated to this version.
   * @param fromVersion the previous version of the app we are upgrading from
   * @returns {LifecycleResult} e.g., {success: true} if the upgrade was successful.
   * If false, the app will be rolled back to the fromVersion.
   */
  public abstract onFinalizeUpgrade(fromVersion: string): Promise<LifecycleResult>;

  /**
   * Perform any actions, such as one scheduling one-time jobs, that can only be preformed after
   * the upgrade was successfully completed.  This function is called *after* onFinalizeUpgrade
   * when the installation has been fully upgraded.
   * @returns {LifecycleResult} e.g., {success: true} if the call was successful.
   * If false, the app will remain at the new version?
   */
  public async onAfterUpgrade(): Promise<LifecycleResult> {
    return {success: true};
  }

  /**
   * Called before an app is uninstalled.
   * @returns {CanUninstallResult} specifying if the app can be uninstalled and an optional user facing message.
   */
  public async canUninstall(): Promise<CanUninstallResult> {
    return {uninstallable: true};
  }

  /**
   * Perform any actions on the integrations platform to complete an uninstall, such as removing
   * webhooks pointing at this installation.
   * @returns {LifecycleResult} specify if the uninstall was successful. If false, it may be retried.
   */
  public abstract onUninstall(): Promise<LifecycleResult>;

  /**
   * Handles outbound OAuth requests. This is triggered by an `oauth_button` on the settings form. The section of the
   * form and its data are given here, and this method should perform any necessary validation, persist changes to the
   * settings store, etc. If everything is in order, the result must provide a redirect to the external OAuth endpoint.
   * Otherwise, the result should provide appropriate error messages and/or toasts.
   * @param section the name of the section in which the `oauth_button` was clicked
   * @param formData the data for the section as a hash of key/value pairs
   * @returns {LifecycleSettingsResult} with a redirect to the external oauth endpoint
   */
  public abstract onAuthorizationRequest(
    section: string,
    formData: SubmittedFormData
  ): Promise<LifecycleSettingsResult>;

  /**
   * Handles inbound OAuth grants. This is triggered after a user grants access via an external OAuth endpoint. If
   * everything is in order, the result should provide a success message via toast and redirect to the next relevant
   * section of the settings form. If something went wrong, the result must provide appropriate error messages
   * and/or toasts and redirect to the originating settings form section.
   * @param request the details of the inbound http request
   * @returns {AuthorizationGrantResult} with appropriate settings redirect and messaging
   */
  public abstract onAuthorizationGrant(request: Request): Promise<AuthorizationGrantResult>;
}

/**
 * @hidden
 */
export const LIFECYCLE_REQUIRED_METHODS = [
  'onInstall',
  'onSettingsForm',
  'onUpgrade',
  'onFinalizeUpgrade',
  'onUninstall',
  'onAuthorizationRequest',
  'onAuthorizationGrant'
];
