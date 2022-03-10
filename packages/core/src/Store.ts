// import { omit } from "@tracker/shared";
import { logger } from "./Utils";

export interface DefDeviceProfiles {
  /** 来源 */
  $referrer: () => string;
  /** 当前时区与 UTC 偏移分钟 */
  $timezone_offset: () => number;
  /** 屏幕宽度 px */
  $screenWidth: () => number;
  /** 屏幕高度 px */
  $screenHeight: () => number;
  /** 视窗宽度 px */
  $viewportWidth: () => number;
  /** 视窗高度 px */
  $viewportHeight: () => number;
  /** 当前 url */
  $url: () => string;
  /** 当前路径 */
  $urlPath: () => string;
  /** 当前标题 */
  $title: () => string;
}

export interface DefElementProfiles {
  /** 元素在 dom 中唯一的选择器 */
  $elementSelector: (el: HTMLElement) => string;
  /** 元素在 dom 中的路径 */
  $elementPath: (el: HTMLElement) => string;
  /** 元素标签类型 */
  $elementTagType: (el: HTMLElement) => string;
  /** 元素的主体内容 */
  $elementContent: (el: HTMLElement) => string;
  /** 元素的类名 */
  $elementClassName: (el: HTMLElement) => string;
}

export interface CustomStoreProfiles {}

export interface StoreProfiles extends DefDeviceProfiles, CustomStoreProfiles, DefElementProfiles {
  [key: string]: any;
}

export type StoreProfilesKeys = keyof StoreProfiles;

export class Store {
  private storeProfiles: StoreProfiles;
  private defDeviceProfiles: StoreProfilesKeys[];
  private defElementProfiles: StoreProfilesKeys[];

  constructor(
    profile: StoreProfiles,
    defDeviceProfiles: StoreProfilesKeys[],
    defElementProfiles: StoreProfilesKeys[]
  ) {
    this.storeProfiles = profile;

    this.defDeviceProfiles = defDeviceProfiles;
    this.defElementProfiles = defElementProfiles;
  }

  public registerProfile(key: string, value: (...arg: unknown[]) => unknown) {
    if (__DEV__ && key in this.storeProfiles) {
      logger.warn("You have modified the existing attribute '${key}'.");
    }
    this.storeProfiles[key] = value;
    return this;
  }

  public registerProfiles(profiles: Record<string, (...arg: unknown[]) => unknown>) {
    for (const key in profiles) {
      this.registerProfile(key, profiles[key]);
    }
    return this;
  }

  // public unregisterProfile(keys: (keyof StoreProfiles)[]) {
  //   this.storeProfiles = omit(this.storeProfiles, keys);
  //   return this;
  // }

  public getNowStoreProfile() {
    return Object.assign({}, this.storeProfiles);
  }

  public getDefDeviceProfiles() {
    return this.defDeviceProfiles.slice();
  }

  public getDefElementProfiles() {
    return this.defElementProfiles.slice();
  }

  // public genDeviceProfiles() {}
}
