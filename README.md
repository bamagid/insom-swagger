# Insomswagger

## Introduction

Insomswagger is a versatile Node.js package designed to simplify the process of converting exported JSON from Insomnia into Swagger documentation. This utility offers flexibility by allowing users to generate either Swagger JSON files or PHP annotations based on their specific needs.

Whether you prefer a clean Swagger JSON representation or you're working within a PHP environment using annotations, this package has you covered. Easily create clear and concise API documentation tailored to your project requirements.

## Installation

Before using the package, ensure you have Node.js installed on your machine. If not, you can download it [here](https://nodejs.org/).

## Usage

To utilize the package, follow these steps:

1. Install the package globally:

   ```bash
   npm install -g insomswagger
   ```

   ```bash
   npm install -g insomswagger
   ```

2. Navigate to the directory containing your input file.

3. Run the following command:

   - For Swagger PHP Annotations:

     ```bash
     npm run insomswagger -a [inputFilePath] [outputFilePath]
     ```

   - For Swagger JSON:
     ```bash
     npm  run insomswagger -j [inputFilePath] [outputFilePath]
     ```

   If `outputFilePath` is not provided, the default names (`annotations.php` for -a and `api-docs.json` for -j) will be used.

## Tips for Organizing Files in Insomnia

For optimal results when generating annotations, consider organizing your files in Insomnia:

- Group requests under folders based on their functionality.
- Use meaningful names for requests and folders.
- Provide descriptions for requests and folders.

## Adding Annotations to Controllers

To incorporate the generated annotations into your controllers, follow these steps:

1. Open the file containing the generated annotations in your preferred IDE.

2. Copy the annotations corresponding to each controller and method.

3. Paste the annotations into the respective controller and method in your codebase.

Annotations with the same tags are placed side by side if you've organized your Insomnia JSON accordingly.

# Viewing Swagger Documentation

To view the Swagger documentation in your Laravel project, you can use tools like [Darkaonline/L5-Swagger](https://github.com/DarkaOnLine/L5-Swagger).

1. If your Laravel project is not using L5-Swagger yet, follow the installation instructions in the [L5-Swagger repository](https://github.com/DarkaOnLine/L5-Swagger) or run this command :

    ````bash
    npm run insomswagger install
    ````

2. Once L5-Swagger is set up, it generates a Swagger JSON file in the `storage/api-docs` directory. If this file doesn't exist, create it.

3. Replace the generated Swagger JSON file with the one generated by Insomnia Docs Swagger. Copy the content of `api-docs.json` generated by Insomnia Docs Swagger and replace the content in `storage/api-docs/api-docs.json`.

Now, when you access the Swagger documentation in your Laravel project, it will reflect the API documentation generated from your Insomnia collection.
## Examples
Here are a few examples of how to use the package:

- For Swagger PHP Annotations:
    ```bash
    npm run insomswagger -a insomnia-export.json my-annotations.php
    ```

- For Swagger JSON:
    ```bash
    npm run insomswagger -j insomnia-export.json my-api-docs.json
    ```
- For Darkaonline/l5-swagger installation:
    ```bash
    npm run insomswagger install
    ```

## License
This package is licensed under the MIT License. See the [LICENSE.md](LICENSE.md) file for details.

## Author
Magid Ba

## Issues and Contributions
If you encounter any issues or want to contribute to the project, please visit the [GitHub repository](https://github.com/bamagid/insomnia-docs-swagger).

Happy documenting!
````
