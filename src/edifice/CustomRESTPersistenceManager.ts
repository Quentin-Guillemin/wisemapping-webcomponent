import { $assert } from '@edifice-wisemapping/core-js';
import { PersistenceError, PersistenceManager } from '@edifice-wisemapping/editor';

class CustomRESTPersistenceManager extends PersistenceManager {
  private documentUrl: string;

  private onSave: boolean;

  private clearTimeout;

  constructor(options: { documentUrl: string }) {
    $assert(options.documentUrl, 'documentUrl can not be null');
    super();

    this.documentUrl = options.documentUrl;
    this.onSave = false;
  }

  saveMapXml(mapId: string, mapXml: Document, pref: string, saveHistory: boolean, events): void {
    const data = {
      blob: new XMLSerializer().serializeToString(mapXml),
    };

    if (!this.onSave) {
      // Mark save in process and fire a event unlocking the save ...
      this.onSave = true;
      this.clearTimeout = setTimeout(() => {
        this.clearTimeout = null;
        this.onSave = false;
      }, 10000);

      const persistence = this;

      const getCookieValue = (name) => {
        const regex = new RegExp(`(^| )${name}=([^;]+)`);
        const match = document.cookie.match(regex);

        return match ? match[2] : null;
      };

      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json',
      };

      if (getCookieValue('XSRF-TOKEN')) {
        headers['X-XSRF-TOKEN'] = getCookieValue('XSRF-TOKEN');
      }

      fetch(this.documentUrl.replace('{id}', mapId), {
        method: 'PUT',
        // Blob helps to resuce the memory on large payload.
        body: new Blob([JSON.stringify(data)], { type: 'text/plain' }),
        headers,
      })
        .then(async (response: Response) => {
          if (response.ok) {
            events.onSuccess();
          } else {
            console.error(`Saving error: ${response.status}`);
            let userMsg: PersistenceError = null;
            if (response.status === 405) {
              userMsg = {
                severity: 'SEVERE',
                message: 'SESSION_EXPIRED',
                errorType: 'session-expired',
              };
            } else {
              const responseText = await response.text();
              const contentType = response.headers['Content-Type'];
              if (contentType != null && contentType.indexOf('application/json') !== -1) {
                let serverMsg: null | { globalSeverity: string } = null;
                try {
                  serverMsg = JSON.parse(responseText);
                  serverMsg = serverMsg && serverMsg.globalSeverity ? serverMsg : null;
                } catch (e) {
                  // Message could not be decoded ...
                }
                userMsg = persistence._buildError(serverMsg);
              }
            }
            if (userMsg) {
              // @ts-ignore
              this.triggerError(userMsg);
              events.onError(userMsg);
            }
          }

          // Clear event timeout ...
          if (persistence.clearTimeout) {
            clearTimeout(persistence.clearTimeout);
          }
          persistence.onSave = false;
        })
        .catch(() => {
          const userMsg: PersistenceError = {
            severity: 'SEVERE',
            message: 'SAVE_COULD_NOT_BE_COMPLETED',
            errorType: 'generic',
          };
          // @ts-ignore
          this.triggerError(userMsg);
          events.onError(userMsg);

          // Clear event timeout ...
          if (persistence.clearTimeout) {
            clearTimeout(persistence.clearTimeout);
          }
          persistence.onSave = false;
        });
    }
  }

  discardChanges(mapId: string): void {
    // nothing to do
  }

  unlockMap(mapId: string): void {
    // nothing to do
  }

  private _buildError(jsonSeverResponse) {
    let message = jsonSeverResponse ? jsonSeverResponse.globalErrors[0] : null;
    let severity = jsonSeverResponse ? jsonSeverResponse.globalSeverity : null;

    if (!message) {
      message = 'SAVE_COULD_NOT_BE_COMPLETED';
    }

    if (!severity) {
      severity = 'INFO';
    }
    return { severity, message };
  }

  loadMapDom(mapId: string): Promise<Document> {
    const url = `${this.documentUrl.replace('{id}', mapId)}`;

    return fetch(url, { method: 'get' })
      .then((response: Response) => {
        if (!response.ok) {
          console.error(`load error: ${response.status}`);
          throw new Error(`load error: ${response.status}, ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => new DOMParser().parseFromString(data.blob, 'text/xml'));
  }
}

export default CustomRESTPersistenceManager;
