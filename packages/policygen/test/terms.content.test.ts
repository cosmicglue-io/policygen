import fs from "node:fs";
import path from "node:path";
import ejs from "ejs";
import i18next from "i18next";
import { beforeAll, describe, expect, test } from "vitest";
import {
  DisputeResolution,
  defaultEntityConfig,
  defaultOutputConfig,
  defaultPrivacyConfig,
  defaultTermsConfig,
  type PolicygenConfig,
  type TermsConfig,
} from "../src/config";
import en from "../src/locales/en";
import { getCssStyles } from "../src/utils/renderTemplate";

const templates = ["terms.html.ejs", "terms.astro.ejs"];

describe.each(templates)("%s content", (templateName) => {
  let template: string;
  let t: typeof i18next.t;

  beforeAll(async () => {
    template = fs.readFileSync(
      path.resolve(__dirname, "../templates", templateName),
      "utf-8",
    );
    await i18next.init({
      fallbackLng: "en",
      interpolation: { escapeValue: true },
      resources: { en },
    });
    t = i18next.t.bind(i18next);
  });

  const render = (terms: Partial<TermsConfig> = {}) => {
    const config: PolicygenConfig = {
      output: defaultOutputConfig,
      entity: {
        ...defaultEntityConfig,
        name: "Test Co",
        website: "https://test.com",
      },
      privacy: defaultPrivacyConfig,
      terms: {
        ...defaultTermsConfig,
        supportEmail: "support@test.com",
        ...terms,
      },
    };
    return ejs.render(template, {
      css: getCssStyles("classes"),
      t,
      config,
      updated: "January 1, 2026",
    });
  };

  test("arbitration without a provider names no institution", () => {
    const rendered = render({
      disputeResolution: DisputeResolution.arbitration,
      governingLaw: "California",
    });

    expect(rendered).toContain(
      "binding arbitration before a single arbitrator, seated in California.",
    );
    expect(rendered).not.toContain("arbitration institute");
  });

  test("arbitration names the configured provider", () => {
    const rendered = render({
      disputeResolution: DisputeResolution.arbitration,
      arbitrationProvider: "JAMS",
      governingLaw: "Delaware",
    });

    expect(rendered).toContain(
      "binding arbitration administered by JAMS under its applicable rules, before a single arbitrator, seated in Delaware.",
    );
  });

  test("litigation ignores an arbitration provider", () => {
    const rendered = render({
      disputeResolution: DisputeResolution.litigation,
      arbitrationProvider: "JAMS",
    });

    expect(rendered).not.toContain("JAMS");
  });

  test("renders the agreement and changes paragraphs", () => {
    const rendered = render();

    expect(rendered).toContain("constitute a legal agreement");
    expect(rendered).toContain("modify or replace these terms of service");
  });

  test("every table-of-contents link points at a section on the page", () => {
    const rendered = render({
      userAccounts: true,
      userContent: true,
      purchasableGoods: true,
      subscription: true,
      liabilityLimitation: true,
      dmcaTakedown: true,
      dmcaEmail: "dmca@test.com",
      taxLiability: true,
      taxJurisdiction: "United States",
    });
    const anchors = [...rendered.matchAll(/href="#([^"]+)"/g)].map(
      (m) => m[1],
    );

    expect(anchors.length).toBeGreaterThan(5);
    for (const anchor of anchors) {
      expect(rendered).toContain(`id="${anchor}"`);
    }
  });
});
