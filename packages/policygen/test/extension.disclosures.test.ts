import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import ejs from "ejs";
import i18next from "i18next";
import { beforeAll, describe, expect, test } from "vitest";
import {
  defaultConfig,
  type BrowserExtensionConfig,
  Platforms,
} from "../src/config";
import en from "../src/locales/en";
import { getCssStyles } from "../src/utils/renderTemplate";

describe("browser-extension disclosure customization", () => {
  beforeAll(async () => {
    await i18next.init({
      fallbackLng: "en",
      interpolation: { escapeValue: true },
      resources: { en },
    });
  });
  const extension: BrowserExtensionConfig = {
    name: "Acme Links",
    permissions: [],
    hostPermissions: [],
    dataCollected: [],
    runsLocally: true,
    dataSentTo: "acme.test",
  };
  const render = (
    format: string,
    overrides: Partial<BrowserExtensionConfig> = {},
  ) => {
    const template = fs.readFileSync(
      path.resolve(__dirname, `../templates/privacy.${format}.ejs`),
      "utf8",
    );
    return ejs.render(template, {
      css: getCssStyles("daisyui"),
      t: i18next.t.bind(i18next),
      updated: "October 3, 2026",
      config: {
        ...defaultConfig,
        privacy: {
          ...defaultConfig.privacy,
          platforms: [Platforms.browserExtension],
          browserExtension: { ...extension, ...overrides },
        },
      },
    });
  };
  for (const format of ["html", "astro"]) {
    test(`${format} retains defaults when overrides are absent or empty`, () => {
      const defaults = render(format);
      expect(defaults).toContain(
        "We do not use extension data for advertising, analytics",
      );
      expect(defaults).toContain(
        "We do not sell, trade, or transfer your extension data",
      );
      expect(render(format, { dataHandling: "", dataSharing: "" })).toBe(
        defaults,
      );
    });
    test(`${format} replaces and escapes both disclosures without changing surrounding clauses`, () => {
      const result = render(format, {
        dataHandling:
          "Acme handles <script>alert('x')</script> & operational {literal} data.",
        dataSharing: "Only Acme's authorized personnel have access.",
        dataHandlingSent: "Send Acme go-links {literally} <safely>.",
        dataHandlingLocal: "Acme local processing & lookups.",
        dataStorageServer: "Store Acme go-links <encrypted>.",
      });
      expect(result).toContain("&lt;script&gt;");
      expect(result).toContain("&amp; operational {literal} data.");
      if (format === "astro")
        expect(result).toMatch(/<p[^>]+is:raw>\s*Acme handles/);
      expect(result).not.toContain("<script>alert");
      expect(result).toContain(
        "Send Acme go-links {literally} &lt;safely&gt;.",
      );
      expect(result).toContain("Acme local processing &amp; lookups.");
      expect(result).toContain("Store Acme go-links &lt;encrypted&gt;.");
      expect(result).toContain(
        "Only Acme&#39;s authorized personnel have access.",
      );
      expect(result).not.toContain(
        "We do not use extension data for advertising, analytics",
      );
      expect(result).not.toContain(
        "We do not sell, trade, or transfer your extension data",
      );
      expect(result).toContain(
        "The extension does not collect browsing history",
      );
    });
  }
  test("the generated schema accepts plain-text overrides and rejects other types", () => {
    const schema = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, "../dist/config_schema.json"),
        "utf8",
      ),
    );
    const validate = new Ajv().compile(schema);
    const config = {
      ...defaultConfig,
      privacy: {
        ...defaultConfig.privacy,
        browserExtension: {
          ...extension,
          dataHandling: "Acme operations",
          dataSharing: "Acme support",
        },
      },
    };
    expect(validate(config)).toBe(true);
    expect(
      validate({
        ...config,
        privacy: {
          ...config.privacy,
          browserExtension: { ...extension, dataHandling: { html: "unsafe" } },
        },
      }),
    ).toBe(false);
  });
});
