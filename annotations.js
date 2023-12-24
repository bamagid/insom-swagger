#!/usr/bin/env node
const fs = require('fs');
const [,, inputPath, outputPath = './annotations.php'] = process.argv;

if (!inputPath) {
  throw new Error('Missing Input Path argument!');
}

// Lire le contenu du fichier d'entrée
const swaggerData = JSON.parse(fs.readFileSync(inputFilePath, 'utf-8'));

// Générer les annotations PHP
const phpAnnotations = generatePhpAnnotations(swaggerData);

// Écrire les annotations PHP dans le fichier de sortie
fs.writeFileSync(outputFilePath, phpAnnotations, 'utf-8');

console.log(`Annotations Swagger générées et écrites dans le fichier PHP avec succès: ${outputFilePath}`);

function generatePhpAnnotations(swaggerData) {
    let phpAnnotations = '<?php\n\n';

    // Générer les annotations de sécurité
    if (swaggerData.security) {
        phpAnnotations += '/**\n * @OA\\SecurityScheme(\n';
        const securityScheme = swaggerData.security[0];
        const securitySchemeName = Object.keys(securityScheme)[0];
        const securitySchemeProperties = securityScheme[securitySchemeName];
        phpAnnotations += ` *     securityScheme="${securitySchemeName}",\n`;
        phpAnnotations += ` *     type="${securitySchemeProperties.type}",\n`;
        phpAnnotations += ` *     scheme="${securitySchemeProperties.scheme}",\n`;
        phpAnnotations += ` *     bearerFormat="${securitySchemeProperties.bearerFormat}"\n`;
        phpAnnotations += ' */\n';
    }

    // Générer les annotations d'information
    if (swaggerData.info) {
        phpAnnotations += '/**\n * @OA\\Info(\n';
        const info = swaggerData.info;
        phpAnnotations += ` *     title="${info.title}",\n`;
        phpAnnotations += ` *     description="${info.description}",\n`;
        phpAnnotations += ` *     version="${info.version}"\n`;
        phpAnnotations += ' */\n';
    }

    // Générer les annotations de consommation
    if (swaggerData.consumes) {
        phpAnnotations += '/**\n * @OA\\Consumes({\n';
        phpAnnotations += ` *     "${swaggerData.consumes.join('","')}"\n`;
        phpAnnotations += ' * })\n */\n';
    }

    // Générer les annotations de chemin
    if (swaggerData.paths) {
        Object.keys(swaggerData.paths).forEach((path) => {
            const pathObject = swaggerData.paths[path];
            Object.keys(pathObject).forEach((method) => {
                const operation = pathObject[method];
                const summary = operation.summary || '';
                const description = operation.description || '';

                // Générer les annotations pour chaque opération
                phpAnnotations += '/**\n';
                phpAnnotations += ` * @OA\\${method.toUpperCase()}(\n`;
                phpAnnotations += ` *     path="${path}",\n`;
                phpAnnotations += ` *     summary="${summary}",\n`;
                phpAnnotations += ` *     description="${description}",\n`;

                // Générer les annotations pour les réponses
                if (operation.responses) {
                    const responseCodes = Object.keys(operation.responses);
                    responseCodes.forEach((responseCode) => {
                        const response = operation.responses[responseCode];
                        const responseDescription = response.description || '';
                        phpAnnotations += ` *     @OA\\Response(response="${responseCode}", description="${responseDescription}"`;

                        // Générer les annotations pour le contenu de la réponse
                        if (response.content) {
                            const contentTypes = Object.keys(response.content);
                            if (contentTypes.length > 0) {
                                phpAnnotations += ', @OA\\JsonContent(';
                                phpAnnotations += `example="${response.content[contentTypes[0]].examples['application/json']}"`;
                                phpAnnotations += ')';
                            }
                        }

                        phpAnnotations += ')\n';
                    });
                }

                // Générer les annotations pour les paramètres
                if (operation.parameters) {
                    operation.parameters.forEach((parameter) => {
                        const inType = parameter.in;
                        const parameterName = parameter.name;
                        const parameterType = parameter.type || 'string';
                        const parameterRequired = parameter.required ? 'true' : 'false';

                        phpAnnotations += ` *     @OA\\Parameter(in="${inType}", name="${parameterName}", `;
                        phpAnnotations += `required=${parameterRequired}, @OA\\Schema(type="${parameterType}")\n`;
                        phpAnnotations += ' * )\n';
                    });
                }

                // Générer les annotations pour les tags
                if (operation.tags) {
                    phpAnnotations += ` *     tags={"${operation.tags.join('","')}"},\n`;
                }

                // Générer les annotations pour la sécurité
                if (operation.security) {
                    phpAnnotations += ' *     security={{';
                    const securityRequirements = operation.security[0];
                    const securityNames = Object.keys(securityRequirements);
                    securityNames.forEach((securityName) => {
                        phpAnnotations += ` "${securityName}": {}`;
                    });
                    phpAnnotations += ' }},\n';
                }

                phpAnnotations += ' * )\n */\n';
            });
        });
    }

    return phpAnnotations;
}
