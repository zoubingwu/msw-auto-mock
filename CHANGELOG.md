# msw-auto-mock

## 0.32.0

### Minor Changes

- a35c1ce: Multiple improvements and fixes since 0.31.0:

  - feat: echo request JSON body into write responses
  - fix: await response generators in handlers
  - fix: handle OpenAPI regex patterns and other schema edge cases (date-time, max array length, example $ref)
  - fix: improve handler ordering and default response selection
  - chore: AI SDK upgrades and dependency/security updates

## 0.31.0

### Minor Changes

- 02bf90d: Enhance typescript support

## 0.30.0

### Minor Changes

- 83539f8: make next function to api scope instead of global

## 0.29.0

### Minor Changes

- 3d490b8: fix string pattern generation

## 0.28.0

### Minor Changes

- a526bf0: chore: switch to ts project for example and upgrade deps

## 0.27.0

### Minor Changes

- 37b63a0: - chore: switch to pnpm 10.6.1 and fix tests ([#83](https://github.com/zoubingwu/msw-auto-mock/pull/83))
  - fix: resolve type object allOf recursively ([#69](https://github.com/zoubingwu/msw-auto-mock/pull/69))
  - Allow for different resource keys than application/json ([#73](https://github.com/zoubingwu/msw-auto-mock/pull/73))
  - Extend transform string logic to return faker's fromRegExp() if a regexp pattern is provided ([#74](https://github.com/zoubingwu/msw-auto-mock/pull/74))
  - Change createOpenAI option baseURL source ([#77](https://github.com/zoubingwu/msw-auto-mock/pull/77))
  - improved the handling of date-time strings and time strings. ([#80](https://github.com/zoubingwu/msw-auto-mock/pull/80))

## 0.26.0

### Minor Changes

- 61df9e8: Added TypeScript file generation option (--typescript) to generate TypeScript files instead of JavaScript files.

## 0.25.0

### Minor Changes

- d03bc3e: Fix generated code for string with max length

## 0.24.0

### Minor Changes

- b2bf101: Fix peer dependency version range

## 0.23.0

### Minor Changes

- 0fb95e1: cache one with static flag for ai mode

## 0.22.0

### Minor Changes

- 8d259bf: Only output ai code when enabled

## 0.21.0

### Minor Changes

- 72829cd: Update faker functions

## 0.20.0

### Minor Changes

- d95b565: Respect min/max constrain for string

## 0.19.0

### Breaking Changes

- Always output to a folder, removed `--node`, `--react-native` options

### Minor Changes

- e2b05fb: Support generate mock data using generative ai, currently support `openai`, `azure` and `anthropic`
