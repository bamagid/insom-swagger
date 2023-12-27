#!/usr/bin/env node
import open from 'open';
import fs from 'fs';
import { exec } from 'child_process';
let [, , option, inputPath, outputPath = "./api-docs.json"] = process.argv;
if (option === "install") {
  // Commande Composer pour installer darkaonline/l5-swagger
  const composerCommand = 'composer require "darkaonline/l5-swagger"';
  // Commande Artisan pour publier les fichiers de configuration
  const artisanCommand = 'php artisan vendor:publish --provider "L5Swagger\\L5SwaggerServiceProvider"';
  // Commande Artisan pour démarrer le serveur
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
      // Exécutez la commande Artisan pour démarrer le serveur
      console.log(
        "darkaonline/l5-swagger installé avec succès. Serveur en cours d'exécution."
        );
        // Ouvrir automatiquement le navigateur avec l'URL spécifiée
        await open("http://127.0.0.1:8000/api/documentation");
      const serveOutput = await runCommand(serveCommand);
        console.log("Serve Output:", serveOutput);
    } catch (error) {
      console.error(error);
    }
  }
  // Appelez la fonction principale
  installL5SwaggerAndServe();
} else if (option === "-j") {
  if (!inputPath) {
    throw new Error("Missing Input Path argument!");
  }
  // Script de génération Swagger
  const BASE_URL = "http://127.0.0.1:8000/";

  const file = JSON.parse(
    fs.readFileSync(inputPath, { encoding: "utf8", flag: "r" })
  );

  const URL_REGEXP = /(?:https?:\/\/[^/]+)?(\/[\w-_/]+)$/;

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
    consumes: ["application/json"],
    paths: file.resources.reduce((ac, item) => {
      if (!item.url || !item.method) {
        // console.error("Skipping invalid resource:", item);
        return ac;
      }
      const match = URL_REGEXP.exec(item.url);
      const extractedUrl = match ? match[0] : "";
      // Ajoute le chemin relatif à l'objet ac sans la base URL
      const key = extractedUrl.slice(BASE_URL.length);
      ac[key] = ac[key] || {};
      item.method = item.method.toLowerCase();
      ac[key][item.method] = {
        summary: item.name || "",
        description: item.description || "",
        produces: ["application/json"],
        responses: {
          200: {
            content: {
              "application/json": {
                examples: {
                  "application/json": "",
                },
              },
            },
            description: "Success",
          },
        },
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
      if (item.body?.text) {
        let json;
        try {
          json = JSON.parse(item.body.text);
        } catch (error) {
          console.error("Error parsing JSON for resource:", item);
          return ac;
        }
        ac[key][item.method].requestBody = {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: Object.entries(json).reduce(
                  (ac, [k, v]) => ({
                    ...ac,
                    [k]: (() => {
                      switch (typeof v) {
                        case "number":
                          return "integer";
                        default:
                          return { type: typeof v };
                      }
                    })(),
                  }),
                  {}
                ),
              },
              example: json,
            },
          },
        };
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
  //verifier si le fichier de sortie a été specifié
  if (outputPath === "./api-docs.json") {
    outputPath = "./annotations.php";
  }
  // Script de génération Annotations PHP
  const swaggerData = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  // Générer les annotations PHP
  const phpAnnotations = generatePhpAnnotations(swaggerData);
  // Écrire les annotations PHP dans le fichier de sortie
  fs.writeFileSync(outputPath, phpAnnotations, "utf-8");
  console.log(
    `Annotations Swagger générées et écrites dans le fichier PHP avec succès: ${outputPath}`
  );
} else {
  console.error(
    "Invalid option. Use -s for Swagger json documentation or -a for Swagger annotations documenation."
  );
}

function generatePhpAnnotations(swaggerData) {
  let phpAnnotations = "<?php\n\n";
  // Générer les annotations de sécurité
  if (swaggerData.components && swaggerData.components.securitySchemes) {
    const securitySchemes = swaggerData.components.securitySchemes;
    Object.keys(securitySchemes).forEach((schemeName) => {
      const securityScheme = securitySchemes[schemeName];
      phpAnnotations += "/**\n * @OA\\Security(\n";
      phpAnnotations += " *     security={\n";
      phpAnnotations += ` *         "${schemeName}": {}\n`;
      phpAnnotations += " *     },\n";
      phpAnnotations += " */\n\n\n";
      phpAnnotations += "/**\n * @OA\\SecurityScheme(\n";
      phpAnnotations += ` *     securityScheme="${schemeName}",\n`;
      phpAnnotations += ` *     type="${securityScheme.type}",\n`;
      phpAnnotations += ` *     scheme="${securityScheme.scheme}",\n`;
      phpAnnotations += ` *     bearerFormat="${securityScheme.bearerFormat}"\n`;
      phpAnnotations += " */\n\n\n";
    });
  }
  // Générer les annotations d'information
  if (swaggerData.info) {
    phpAnnotations += "/**\n * @OA\\Info(\n";
    const info = swaggerData.info;
    phpAnnotations += ` *     title="${info.title}",\n`;
    phpAnnotations += ` *     description="${info.description}",\n`;
    phpAnnotations += ` *     version="${info.version}"\n`;
    phpAnnotations += " */\n\n\n";
  }
  // Générer les annotations de consommation
  if (swaggerData.consumes) {
    phpAnnotations += "/**\n * @OA\\Consumes({\n";
    phpAnnotations += ` *     "${swaggerData.consumes.join('","')}"\n`;
    phpAnnotations += " * })\n */\n\n\n";
  }
  // Générer les annotations de tags
  if (swaggerData.tags) {
    swaggerData.tags.forEach((tag) => {
      phpAnnotations += "/**\n * @OA\\Tag(\n";
      phpAnnotations += ` *     name="${tag.name}",\n`;
      phpAnnotations += ` *     description="${tag.description}"\n`;
      phpAnnotations += " * )\n */\n\n\n";
    });
  }
  // Générer les annotations de chemin
  if (swaggerData.paths) {
    Object.keys(swaggerData.paths).forEach((path) => {
      const pathObject = swaggerData.paths[path];
      Object.keys(pathObject).forEach((method) => {
        const operation = pathObject[method];
        const summary = operation.summary || "";
        const description = operation.description || "";
        // Générer les annotations pour chaque opération
        phpAnnotations += "/**\n";
        phpAnnotations += ` * @OA\\${method.toUpperCase()}(\n`;
        phpAnnotations += ` *     path="${path}",\n`;
        phpAnnotations += ` *     summary="${summary}",\n`;
        phpAnnotations += ` *     description="${description}",\n`;
        // Générer les annotations pour les réponses
        if (operation.responses) {
          const responseCodes = Object.keys(operation.responses);
          responseCodes.forEach((responseCode) => {
            const response = operation.responses[responseCode];
            const responseDescription = response.description || "";
            phpAnnotations += ` *     @OA\\Response(response="${responseCode}", description="${responseDescription}"`;
            // Générer les annotations pour le contenu de la réponse
            if (response.content) {
              const contentTypes = Object.keys(response.content);
              if (contentTypes.length > 0) {
                phpAnnotations += ", @OA\\JsonContent(";
                phpAnnotations += `example="${
                  response.content[contentTypes[0]].examples["application/json"]
                }"`;
                phpAnnotations += ")";
              }
            }
            phpAnnotations += ")\n";
          });
        }
        // Générer les annotations pour les paramètres
        if (operation.parameters) {
          operation.parameters.forEach((parameter) => {
            const inType = parameter.in;
            const parameterName = parameter.name;
            const parameterType = parameter.type || "string";
            const parameterRequired = parameter.required ? "true" : "false";
            phpAnnotations += ` *     @OA\\Parameter(in="${inType}", name="${parameterName}", `;
            phpAnnotations += `required=${parameterRequired}, @OA\\Schema(type="${parameterType}")\n`;
            phpAnnotations += " * )\n";
          });
        }
        // Générer les annotations pour le requestBody
        if (operation.requestBody) {
          const requestBody = operation.requestBody;
          const contentTypes = Object.keys(requestBody.content);
          const example = JSON.stringify(
            requestBody.content[contentTypes[0]].example,
            null,
            4
          )
            .split("\n")
            .map((line) => ` *${line ? ` ${line}` : ""}`)
            .join("\n");

          phpAnnotations += ` *     @OA\\RequestBody(\n`;
          phpAnnotations += ` *         required=true,\n`;
          phpAnnotations += ` *         @OA\\JsonContent(\n`;
          phpAnnotations += ` *             example=\n`;
          phpAnnotations += ` ${example}\n`;
          phpAnnotations += ` *         )\n`;
          phpAnnotations += ` *     ),\n`;
        }
        // Générer les annotations pour les tags
        if (operation.tags) {
          phpAnnotations += ` *     tags={"${operation.tags.join('","')}"},\n`;
        }
        // Générer les annotations pour la sécurité
        if (operation.security) {
          phpAnnotations += " *     security={{";
          const securityRequirements = operation.security[0];
          const securityNames = Object.keys(securityRequirements);
          securityNames.forEach((securityName) => {
            phpAnnotations += ` "${securityName}": {}`;
          });
          phpAnnotations += " }},\n";
        }
        phpAnnotations += " * )\n */\n\n\n";
      });
    });
  }
  return phpAnnotations;
}
