import type { ObjectType } from "@tracker/shared";
import type { BaseSendImplement, BaseSendOptions } from "./types";

import { isUndefined } from "@tracker/shared";
import { logger } from "./log";

type AjaxMethodTypes = "GET" | "POST" | "PUT" | "DELETE";

export interface AjaxSendReportOptions {
  /** AjaxSend async @default true */
  ajaxSendAsync?: boolean;
  /** AjaxSend headers @default {} */
  ajaxSendHeaders?: ObjectType<string, string>;
  /** AjaxSend methods @default "POST" */
  ajaxSendMethod?: AjaxMethodTypes;
  /** AjaxSend withCredentials @default undefined */
  ajaxSendWithCredentials?: boolean;
  /** AjaxSend ValidateStatus @default [200,300) */
  ajaxSendValidateStatus?: (status: number) => boolean;
}

export interface AjaxSendOptions extends BaseSendOptions, AjaxSendReportOptions {}

const AjaxSendDefOptions = {
  sendTimeout: 500,
  ajaxSendMethod: "POST",
  ajaxSendAsync: true,
  ajaxSendWithCredentials: false,
  ajaxSendHeaders: {
    "Content-Type": "application/json"
  },
  ajaxSendValidateStatus(status: number) {
    return status >= 200 && status < 300;
  }
};

export class AjaxSend implements BaseSendImplement {
  public static type = "Ajax";
  public static validator = () => {
    const isHasXMLHttpRequestApi = window && "XMLHttpRequest" in window;
    if (__DEV__) {
      !isHasXMLHttpRequestApi && logger.warn("Your browser does not support 'XMLHttpRequest Api'");
    }
    return isHasXMLHttpRequestApi;
  };

  private options: Required<AjaxSendOptions>;
  constructor(options: AjaxSendOptions) {
    this.options = Object.assign({}, AjaxSendDefOptions, options);
  }

  private xhrRequest(profile: ObjectType, options?: AjaxSendReportOptions): Promise<boolean> {
    return new Promise(resolve => {
      const ops = Object.assign({}, this.options, options);
      let request: XMLHttpRequest | null = new XMLHttpRequest();

      request.open(ops.ajaxSendMethod, ops.url, this.options.ajaxSendAsync);

      // set timeout
      request.timeout = ops.sendTimeout;

      // set withCredentials
      if (!isUndefined(ops.ajaxSendWithCredentials)) {
        request.withCredentials = !!ops.ajaxSendWithCredentials;
      }

      // set headers
      if ("setRequestHeader" in request) {
        const headers = this.options.ajaxSendHeaders;
        for (const key in headers) {
          // Remove Content-Type if data is undefined
          if (typeof profile === "undefined" && key.toLowerCase() === "content-type") {
            continue;
          } else {
            // Otherwise add header to the request
            request.setRequestHeader(key, headers[key]);
          }
        }
      }

      const clearRequest = () => {
        request = null;
      };

      const onloadend = () => {
        if (!request) return;
        const { ajaxSendValidateStatus } = this.options;
        if (ajaxSendValidateStatus(request.status)) {
          resolve(true);
        } else {
          resolve(false);
        }
        clearRequest();
      };

      if ("onloadend" in request) {
        request.onloadend = onloadend;
      }

      request.onreadystatechange = () => {
        if (!request || request.readyState !== 4) return;
        setTimeout(onloadend);
      };

      request.onabort = () => {
        resolve(false);
        clearRequest();
      };
      request.onerror = () => {
        resolve(false);
        clearRequest();
      };
      request.ontimeout = () => {
        resolve(false);
        clearRequest();
      };

      const sendData = profile ? JSON.stringify(profile) : null;

      request.send(sendData);
    });
  }

  public report(profile: ObjectType, options?: AjaxSendReportOptions) {
    return this.xhrRequest(profile, options);
  }
}
