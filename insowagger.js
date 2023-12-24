#!/usr/bin/env node

const fs = require('fs');
const [,, inputPath, outputPath = './api-docs.json'] = process.argv;

if (!inputPath) {
  throw new Error('Missing Input Path argument!');
}

const BASE_URL = 'http://127.0.0.1:8000/';

const file = JSON.parse(fs.readFileSync(inputPath, { encoding: 'utf8', flag: 'r' }));

const URL_REGEXP = /(?:https?:\/\/[^/]+)?(\/[\w-_/]+)$/;

const swagger = {
  openapi: '3.0.0',
  info: {
    title: 'Your API Title',
    description: 'Your API Description',
    version: '1.0.0',
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  consumes: ['application/json'],
  paths: file.resources.reduce((ac, item) => {
    if (!item.url || !item.method) {
      console.error('Skipping invalid resource:', item);
      return ac;
    }

    const match = URL_REGEXP.exec(item.url);
    const extractedUrl = match ? match[0] : '';

    // Ajoute le chemin relatif à l'objet ac sans la base URL
    const key = extractedUrl.slice(BASE_URL.length);

    ac[key] = ac[key] || {};
    item.method = item.method.toLowerCase();

    ac[key][item.method] = {
      summary: item.name || '',
      description: item.description || '',
      produces: ['application/json'],
      responses: {
        200: {
          content: {
            'application/json': {
              examples: {
                'application/json': '',
              },
            },
          },
          description: 'Success',
        },
      },
      tags: [item.parentId ? file.resources.find((resource) => resource._id === item.parentId)?.name || '' : ''],
    };

    ac[key][item.method].parameters = [];

    if (item.parameters && item.parameters.length) {
      ac[key][item.method].parameters.push(
        ...item.parameters.map((param) => ({
          in: 'path',
          name: param.name || '',
          type: param.type || 'string',
        }))
      );
    }

    if (item.headers && item.headers.length) {
      ac[key][item.method].parameters.push(
        ...item.headers
          .filter((p) => p.name !== 'Content-Type')
          .map((p) => ({
            in: 'header',
            name: p.name || '',
            type: p.type || 'string',
          }))
      );
    }

    if (item.body?.text) {
      let json;
      try {
        json = JSON.parse(item.body.text);
      } catch (error) {
        console.error('Error parsing JSON for resource:', item);
        return ac;
      }
      ac[key][item.method].requestBody = {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: Object.entries(json).reduce(
                (ac, [k, v]) => ({
                  ...ac,
                  [k]: (() => {
                    switch (typeof v) {
                      case 'number':
                        return 'integer';
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
    `Documentation Swagger générées et écrites dans le fichier json avec succès: ${outputPath}`
  );
