import fs from "node:fs";
import path from "node:path";
import ejs from "ejs";
import i18next, { type TFunction } from "i18next";
import type { FileType, Locale, PolicygenConfig } from "../config";
import en from "../locales/en";

/**
 * Renders an EJS template and writes the output to a file.
 * @param templatePath - Path to the EJS template file.
 * @param data - Data to pass to the template.
 * @param outputPath - Path to write the rendered output.
 */
export async function renderTemplate(
  config: PolicygenConfig,
  policyType: "privacy" | "terms",
): Promise<void> {
  try {
    // Read the template file
    const templatePath = getTemplatePath(config.output.fileType, policyType);
    const template = fs.readFileSync(templatePath, "utf-8");

    // Initialize i18next
    const t = await getI18n();

    // Get the CSS styles based on the framework
    const css = getCssStyles(config.output.cssFramework);

    // For each locale, render the template
    const locales = config.output.locales;
    for (const locale of locales) {
      // Set the current language for i18next
      i18next.changeLanguage(locale);

      const outputPath = getOutputPath(config, locale, policyType);
      await renderTemplateToFile(template, outputPath, css, t, config);
      console.log(`✅ Successfully rendered template to ${outputPath}`);
    }
  } catch (error) {
    console.error(`❌ Failed to render template: ${error}`);
    throw error;
  }
}

/**
 * Get the CSS styles for the template.
 * @param cssFramework - The framework to use (e.g., "tailwind, daisy, classes").
 */
export function getCssStyles(cssFramework: string): Record<string, string> {
  switch (cssFramework) {
    case "tailwind":
      return {
        container: "container mx-auto px-4 py-8",
        section: "mb-8",
        heading: "text-2xl font-bold mb-4",
        subheading: "text-xl font-semibold mb-2",
        tertiary: "text-lg font-semibold mb-2",
        paragraph: "text-base mb-4",
        bold: "font-bold",
        list: "list-disc pl-5 mb-4",
        ol_class: "list-decimal pl-5 mb-4",
        ul_class: "list-disc pl-5 mb-4",
        listItem: "mb-2",
        link: "text-blue-500 hover:underline",
        footer: "text-sm text-gray-500 mt-8",
      };
    case "daisyui":
      return {
        container: "container mx-auto px-4 py-8",
        section: "mb-8",
        heading: "text-primary text-2xl font-bold mb-4",
        subheading: "text-secondary text-xl font-semibold mb-2",
        tertiary: "text-accent text-lg font-semibold mb-2",
        paragraph: "text-base mb-4",
        bold: "font-bold",
        list: "list-disc pl-5 mb-4",
        ol_class: "list-decimal pl-5 mb-4",
        ul_class: "list-disc pl-5 mb-4",
        listItem: "mb-2",
        link: "text-primary hover:underline",
        footer: "text-sm text-gray-500 mt-8",
      };
    case "classes":
      return {
        container: "container",
        section: "section",
        heading: "heading",
        subheading: "subheading",
        tertiary: "tertiary",
        paragraph: "paragraph",
        bold: "bold",
        list: "list",
        ol_class: "ordered-list",
        ul_class: "unordered-list",
        listItem: "list-item",
        link: "link",
        footer: "footer",
      };
    default:
      throw new Error(`Unknown framework: ${cssFramework}`);
  }
}

/**
 * Get i18next instance
 * @returns i18next instance
 * @throws Error if i18next is not initialized
 */
async function getI18n() {
  return await i18next.init({
    fallbackLng: "en",
    interpolation: {
      escapeValue: true, // Enable escaping to prevent XSS - templates use <%- for intentional HTML
    },
    resources: {
      en,
    },
  });
}

/**
 * Get the output path for the generated policy file.
 * @param config - The policygen configuration object.
 * @param locale - The locale for the generated file.
 * @param policyType - The type of policy (privacy or terms).
 * @returns The output path for the generated policy file.
 */
function getOutputPath(
  config: PolicygenConfig,
  locale: Locale,
  policyType: "privacy" | "terms",
): string {
  // biome-ignore lint/style/noNonNullAssertion: File path is guaranteed to exist when this function is called
  const outputPath = config.output[`${policyType}FilePath`]!;

  if (config.output.locales.length > 1) {
    if (!outputPath.includes("{locale}")) {
      throw new Error(
        `Output path for ${policyType} must include {locale} placeholder when multiple locales are specified.`,
      );
    } else {
      return outputPath.replace("{locale}", locale);
    }
  }

  return outputPath;
}

/**
 * Loads the EJS template file based on the policy type and file type.
 * @param fileType - The type of file to generate (html).
 * @param policyType - The type of policy (privacy or terms).
 * @returns The path to the EJS template file.
 */
function getTemplatePath(
  fileType: FileType,
  policyType: "privacy" | "terms",
): string {
  const templateDir = path.join(__dirname, "../../templates");
  const templateFile = `${policyType}.${fileType}.ejs`;
  return path.join(templateDir, templateFile);
}

/**
 * Renders the EJS template with the provided data and writes it to a file.
 * @param template - The EJS template string.
 * @param data - The data to render the template with.
 * @param outputPath - The path to write the rendered output.
 * @throws Error if the output path is not specified
 */
async function renderTemplateToFile(
  template: string,
  outputPath: string,
  css: Record<string, string>,
  t: TFunction,
  config: PolicygenConfig,
): Promise<void> {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  const rendered = await ejs.render(template, {
    css,
    t,
    config,
    updated: formatDate(new Date()),
  });

  // Ensure the output directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  // Write the rendered output to the specified file
  fs.writeFileSync(outputPath, rendered, "utf-8");
}
