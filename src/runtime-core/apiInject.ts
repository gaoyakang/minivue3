import { getCurrentInstance } from "./component";

// 存
export function provide(key, value) {
  const currentInstance: any = getCurrentInstance();
  // provides必须在setup中调用
  if (currentInstance) {
    let { providers } = currentInstance;
    const parentProviders = currentInstance.parent.providers;

    // 初始化
    if (providers === parentProviders) {
      providers = currentInstance.providers = Object.create(parentProviders);
    }
    providers[key] = value;
  }
}

// 取
export function inject(key, defaultValue) {
  const currentInstance: any = getCurrentInstance();
  // provides必须在setup中调用
  if (currentInstance) {
    const parentProviders = currentInstance.parent.providers;
    if (key in parentProviders) {
      return parentProviders[key];
    } else if (defaultValue) {
      if (typeof defaultValue === "function") {
        return defaultValue();
      }
      return defaultValue;
    }
  }
}
