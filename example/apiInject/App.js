import { h, provide, inject } from "../../lib/guide-mini-vue.esm.js";

const provider = {
  name: "Provider",
  setup() {
    provide("foo", "fooVal");
    provide("bar", "barVal");
  },
  render() {
    return h("div", {}, [h("p", {}, "provider"), h(ProviderTwo)]);
  },
};

const ProviderTwo = {
  name: "ProviderTwo",
  setup() {
    provide("foo", "fooTwo");
    const foo = inject("foo");
    return {
      foo,
    };
  },
  render() {
    return h("div", {}, [
      h("p", {}, `ProviderTwo foo:${this.foo}`),
      h(Consumer),
    ]);
  },
};

const Consumer = {
  name: "Consumer",
  setup() {
    const foo = inject("foo");
    const bar = inject("bar");
    // const baz = inject("baz", "bazdefault");
    const baz = inject("baz", () => "bazdefault");
    return { foo, bar, baz };
  },
  render() {
    return h("div", {}, `Consumer - ${this.foo} - ${this.bar} - ${this.baz}`);
  },
};

export const App = {
  name: "App",
  render() {
    return h("div", {}, [h("p", {}, "apiInject"), h(provider)]);
  },
  setup() {
    return {};
  },
};
