#!/usr/bin/env node
import open from "open";
import fs from "fs";
import { exec } from "child_process";
import yaml from "js-yaml";
let [, , option, inputPath, outputPath = "./api-docs.json"] = process.argv;
if (option === "install") {
  const composerCommand = 'composer require "darkaonline/l5-swagger"';
  const artisanCommand =
    'php artisan vendor:publish --provider "L5Swagger\\L5SwaggerServiceProvider"';
  const optimizeCommand = "php artisan optimize:clear";
  const serveCommand = "php artisan serve";
  // Fonction pour exécuter une commande
  function runCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(
            `Erreur lors de l'exécution de la commande : ${error.message}`
          );
        } else {
          resolve(stdout || stderr);
        }
      });
    });
  }
  // Fonction principale pour exécuter les commandes
  async function installL5SwaggerAndServe() {
    try {
      // Exécutez la commande Composer
      const composerOutput = await runCommand(composerCommand);
      console.log("Composer Output:", composerOutput);
      // Exécutez la commande Artisan
      const artisanOutput = await runCommand(artisanCommand);
      console.log("Artisan Output:", artisanOutput);
      // Exécutez la commande Optimize
      const optimizeCommand = await runCommand(optimizeCommand);
      console.log("Optimize Output:", optimizeCommand);
      // Exécutez la commande Artisan pour démarrer le serveur
      console.log(
        "darkaonline/l5-swagger installé avec succès. Serveur en cours d'exécution."
      );
      // Ouvrir automatiquement le navigateur avec l'URL spécifiée
      await open("http://127.0.0.1:8000/api/documentation");
      const serveOutput = await runCommand(serveCommand);
      console.log("Serve Output: ", serveOutput);
    } catch (error) {
      console.error(error);
    }
  }
  // Appelez la fonction principale
  installL5SwaggerAndServe();
} else if (option === "update") {
  function runCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(`${error.message}`);
        } else {
          resolve(stdout || stderr);
        }
      });
    });
  }

  const npmUninstallCommand = "npm uninstall -g insomswagger";
  const npmInstallCommand = "npm install -g insomswagger";

  // Fonction pour exécuter une commande npm
  async function runNpmCommand(command) {
    try {
      await runCommand(command);
      // Après la désinstallation, exécute la commande npm install
      const installResult = await runCommand(npmInstallCommand);
      console.log(`${installResult}`);
    } catch (error) {
      console.error(`${error}`);
    }
  }
  // Exécute la commande npm uninstall
  runNpmCommand(npmUninstallCommand)
    .then(() => {
      // Après la désinstallation, exécute la commande npm install
      return runNpmCommand(npmInstallCommand);
    })
    .catch((error) => {
      console.error(`${error}`);
    });
} else if (option === "-j") {
  if (!inputPath) {
    throw new Error("Missing Input Path argument!");
  }
  const file = JSON.parse(
    fs.readFileSync(inputPath, { encoding: "utf8", flag: "r" })
  );
  function generateResponseExample(item) {
    const method = item.method ? item.method.toUpperCase() : "GET";
    const responses = [];

    switch (method) {
      case "POST":
        responses.push({ status: 201, description: "Created successfully" });
        responses.push({ status: 400, description: "Bad Request" });
        responses.push({ status: 401, description: "Unauthorized" });
        responses.push({ status: 403, description: "Forbidden" });
        break;
      case "DELETE":
        responses.push({ status: 204, description: "Deleted successfully" });
        responses.push({ status: 404, description: "Not Found" });
        responses.push({ status: 401, description: "Unauthorized" });
        responses.push({ status: 403, description: "Forbidden" });
        break;
      default:
        responses.push({ status: 200, description: "OK" });
        responses.push({ status: 404, description: "Not Found" });
        responses.push({ status: 500, description: "Internal Server Error" });
        break;
    }

    const responseExamples = {};
    responses.forEach((response) => {
      responseExamples[response.status] = {
        description: response.description,
        content: {
          "application/json": {
            schema: {},
            example: "",
          },
        },
      };
    });

    return responseExamples;
  }
  function generateRequestBody(item) {
    if (item.body?.text || item.body?.params) {
      let json;
      if (item.body.text) {
        try {
          json = JSON.parse(item.body.text);
        } catch (error) {
          console.error("Error parsing JSON for resource:", item);
          return null;
        }
      } else if (item.body.params) {
        json = item.body.params.reduce((acc, param) => {
          acc[param.name] = param.value;
          if (param.type === "file") {
            acc[param.name] = { type: "string", format: "binary" };
          }
          return acc;
        }, {});
      }
      const contentType =
        item.method.toUpperCase() === "PUT" ||
        item.method.toUpperCase() === "PATCH"
          ? "application/x-www-form-urlencoded"
          : "multipart/form-data";
      return {
        content: {
          [contentType]: {
            schema: {
              type: "object",
              properties: Object.entries(json).reduce((ac, [k, v]) => {
                switch (typeof v) {
                  case "number":
                    ac[k] = { type: "integer" };
                    break;
                  case "object":
                    ac[k] = { type: "string", format: "binary" };
                    break;
                  default:
                    ac[k] = { type: typeof v };
                }
                return ac;
              }, {}),
            },
            example: json,
          },
        },
      };
    }

    return null;
  }

  const swagger = {
    openapi: "3.0.0",
    info: {
      title: "Your API Title",
      description: "Your API Description",
      version: "1.0.0",
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    consumes: ["multipart/form-data"],
    paths: file.resources.reduce((ac, item) => {
      if (!item.url || !item.method) {
        return ac;
      }

      const indexOfApi = item.url.indexOf("/api/");
      const extractedUrl =
        indexOfApi !== -1 ? item.url.substring(indexOfApi) : item.url;
      const key = extractedUrl;

      ac[key] = ac[key] || {};
      item.method = item.method.toLowerCase();

      ac[key][item.method] = {
        summary: item.name || "",
        description: item.description || "",
        responses: generateResponseExample(item),
        tags: [
          item.parentId
            ? file.resources.find((resource) => resource._id === item.parentId)
                ?.name || ""
            : "",
        ],
      };
      ac[key][item.method].parameters = [];
      if (item.parameters && item.parameters.length) {
        ac[key][item.method].parameters.push(
          ...item.parameters.map((param) => ({
            in: "path",
            name: param.name || "",
            type: param.type || "string",
          }))
        );
      }
      if (item.headers && item.headers.length) {
        ac[key][item.method].parameters.push(
          ...item.headers
            .filter((p) => p.name !== "Content-Type")
            .map((p) => ({
              in: "header",
              name: p.name || "",
              type: p.type || "string",
            }))
        );
      }
      const requestBody = generateRequestBody(item);
      if (requestBody) {
        ac[key][item.method].requestBody = requestBody;
      }

      return ac;
    }, {}),
  };
  fs.writeFileSync(outputPath, JSON.stringify(swagger, null, 4));
  console.log(
    `Documentation Swagger générée et écrite dans le fichier json avec succès: ${outputPath}`
  );
} else if (option === "-a") {
  if (!inputPath) {
    throw new Error("Missing Input Path argument!");
  }

  // Script de génération Annotations PHP
  const swaggerData = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  const annotationsByTag = generatePhpAnnotationsByTag(swaggerData);
  fs.mkdirSync("app/Http/Controllers/Annotations");
  writePhpAnnotationFiles(annotationsByTag, swaggerData);
} else if (option === "-y") {
  if (!inputPath) {
    throw new Error("Missing Input Path argument!");
  }
  if (outputPath === "./api-docs.json") {
    outputPath = "./api-docs.yaml";
  }
  const file = JSON.parse(
    fs.readFileSync(inputPath, { encoding: "utf8", flag: "r" })
  );
  const yamlData = yaml.dump(file);
  outputPath = outputPath.replace(".json", ".yaml");
  fs.writeFileSync(outputPath, yamlData);
  console.log(
    `Swagger JSON file successfully converted to YAML and written to: ${outputPath}`
  );
} else {
  console.error(
    "Invalid option. Use -s for Swagger json documentation or -a for Swagger annotations documenation."
  );
}

function generatePhpAnnotationsByTag(swaggerData) {
  const annotationsByTag = {};
  if (swaggerData) {
    Object.keys(swaggerData.paths).forEach((path) => {
      const pathObject = swaggerData.paths[path];
      Object.keys(pathObject).forEach((method) => {
        const operation = pathObject[method];
        const tags = operation.tags || [];
        const summary = operation.summary || "";
        const description = operation.description || "";
        // Générer les annotations de chemin
        tags.forEach((tag) => {
          // Initialiser la chaîne d'annotations si elle n'existe pas
          if (!annotationsByTag[tag]) {
            annotationsByTag[tag] = "";
          }
          // Générer les annotations pour chaque opération
          annotationsByTag[tag] += "\n";
          annotationsByTag[tag] += ` * @OA\\${method.toUpperCase()}(\n`;
          annotationsByTag[tag] += ` *     path="${path}",\n`;
          annotationsByTag[tag] += ` *     summary="${summary}",\n`;
          annotationsByTag[tag] += ` *     description="${description}",\n`;
          // Générer les annotations pour la sécurité
          annotationsByTag[tag] += ` *         security={\n`;
          annotationsByTag[tag] += ` *    {       "BearerAuth": {}}\n`;
          annotationsByTag[tag] += ` *         },\n`;
          // Générer les annotations pour les réponses
          if (operation.responses) {
            const responseCodes = Object.keys(operation.responses);
            responseCodes.forEach((responseCode) => {
              const response = operation.responses[responseCode];
              const responseDescription = response.description || "";

              annotationsByTag[
                tag
              ] += ` * @OA\\Response(response="${responseCode}", description="${responseDescription}"`;

              // Générer les annotations pour le contenu de la réponse
              if (response.content) {
                const contentTypes = Object.keys(response.content);

                if (contentTypes.length > 0) {
                  const firstContentType = contentTypes[0];

                  if (response.content[firstContentType].examples) {
                    const examples =
                      response.content[firstContentType].examples;

                    if (examples["application/json"]) {
                      annotationsByTag[tag] += ", @OA\\JsonContent(";
                      annotationsByTag[
                        tag
                      ] += `example="${examples["application/json"]}"`;
                      annotationsByTag[tag] += "),";
                    }
                  }
                }
              }

              annotationsByTag[tag] += "),\n";
            });
          }
          // Générer les annotations pour les paramètres
          if (operation.parameters) {
            operation.parameters.forEach((parameter) => {
              const inType = parameter.in;
              const parameterName = parameter.name;
              const parameterType = parameter.type || "string";
              const parameterRequired = parameter.required ? "true" : "false";
              annotationsByTag[
                tag
              ] += ` *     @OA\\Parameter(in="${inType}", name="${parameterName}", `;
              annotationsByTag[
                tag
              ] += `required=${parameterRequired}, @OA\\Schema(type="${parameterType}")\n`;
              annotationsByTag[tag] += " * ),\n";
            });
          }
          // Générer les annotations pour le requestBody
          if (operation.requestBody) {
            const requestBody = operation.requestBody;
            const contentTypes = Object.keys(requestBody.content);

            annotationsByTag[tag] += ` *     @OA\\RequestBody(\n`;
            annotationsByTag[tag] += ` *         required=true,\n`;

            if (contentTypes.length > 0) {
              const firstContentType = contentTypes[0];
              let contentType;
              if (
                method.toUpperCase() === "PUT" ||
                method.toUpperCase() === "PATCH"
              ) {
                contentType = "application/x-www-form-urlencoded";
              } else {
                contentType = "multipart/form-data";
              }
              annotationsByTag[tag] += ` *         @OA\\MediaType(\n`;
              annotationsByTag[
                tag
              ] += ` *             mediaType="${contentType}",\n`;
              annotationsByTag[tag] += ` *             @OA\\Schema(\n`;
              annotationsByTag[tag] += ` *                 type="object",\n`;
              annotationsByTag[tag] += ` *                 properties={\n`;

              // Générer les annotations pour chaque propriété du formulaire
              const formProperties =
                requestBody.content[firstContentType].schema.properties;
              Object.keys(formProperties).forEach((propertyName) => {
                const property = formProperties[propertyName];
                const propertyType = property.type || "string";

                annotationsByTag[
                  tag
                ] += ` *                     @OA\\Property(property="${propertyName}", type="${propertyType}"`;
                if (property.format === "binary") {
                  annotationsByTag[tag] += `, format="binary"`;
                }

                annotationsByTag[tag] += `),\n`;
              });

              annotationsByTag[tag] += ` *                 },\n`;
              annotationsByTag[tag] += ` *             ),\n`;
              annotationsByTag[tag] += ` *         ),\n`;
            }

            annotationsByTag[tag] += ` *     ),\n`;
          }
          if (operation.tags) {
            annotationsByTag[tag] += ` *     tags={"${operation.tags.join(
              '","'
            )}"},\n`;
          }
          annotationsByTag[tag] += `*),\n\n`;
        });
      });
    });
  }
  return annotationsByTag;
}
function writePhpAnnotationFiles(annotationsByTag, swaggerData) {
  let annotations = "<?php\n\n";
   annotations += `namespace App\\Http\\Controllers\\Annotations ;\n\n`;
  // Générer les annotations de sécurité
  if (swaggerData.components && swaggerData.components.securitySchemes) {
    const securitySchemes = swaggerData.components.securitySchemes;
    Object.keys(securitySchemes).forEach((schemeName) => {
      const securityScheme = securitySchemes[schemeName];
      annotations += "/**\n * @OA\\Security(\n";
      annotations += " *     security={\n";
      annotations += ` *         "${schemeName}": {}\n`;
      annotations += " *     }),\n";
      annotations += "\n * @OA\\SecurityScheme(\n";
      annotations += ` *     securityScheme="${schemeName}",\n`;
      annotations += ` *     type="${securityScheme.type}",\n`;
      annotations += ` *     scheme="${securityScheme.scheme}",\n`;
      annotations += ` *     bearerFormat="${securityScheme.bearerFormat}"),\n`;
    });
  }
  // Générer les annotations d'information
  if (swaggerData.info) {
    annotations += "\n * @OA\\Info(\n";
    const info = swaggerData.info;
    annotations += ` *     title="${info.title}",\n`;
    annotations += ` *     description="${info.description}",\n`;
    annotations += ` *     version="${info.version}"),\n`;
  }
  // Générer les annotations de consommation
  if (swaggerData.consumes) {
    annotations += "\n * @OA\\Consumes({\n";
    annotations += ` *     "${swaggerData.consumes.join('","')}"\n`;
    annotations += " * }),\n\n";
    annotations += " *\n";
  }
  Object.keys(annotationsByTag).forEach((tag) => {
    const phpAnnotations = annotations + annotationsByTag[tag];
    const capitalizedTag = tag.charAt(0).toUpperCase() + tag.slice(1)+"AnnotationController";
    const name =capitalizedTag.replace(/[^a-z0-9]/gi, "");
    const fileName = name  + ".php";
    fs.writeFileSync("app/Http/Controllers/Annotations/"+fileName, phpAnnotations + `\n*/\n\n class ${name} {}\n`, "utf-8");
    console.log(
      `Annotations Swagger pour le tag "${tag}" générées et écrites dans le fichier : ${fileName}`
    );
  });
}
