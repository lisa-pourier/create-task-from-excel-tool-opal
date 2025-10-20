"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpalToolFunction = void 0;
const app_sdk_1 = require("@zaiusinc/app-sdk");
// import { AuthSection } from '../data/data';
// import { parseExcelFromCmp } from 'OpalToolExcelParse.ts';
const cmp_1 = require("../cmp");
const axios_1 = __importDefault(require("axios"));
const xlsx_1 = __importDefault(require("xlsx"));
// Define Opal tool metadata  - list of tools and their parameters
const discoveryPayload = {
    'functions': [
        // LP Added: query-excel endpoint to fetch campaigns from CMP Excel
        {
            'name': 'get_excel_details',
            'description': 'Fetches and filters campaigns from the CMP Excel asset',
            'parameters': [
                { 'name': 'asset_id', 'type': 'string', 'description': 'CMP asset ID', 'required': true }
            ],
            'endpoint': '/tools/get-excel-details',
            'http_method': 'POST',
            'auth_requirements': [
                {
                    'provider': 'OptiID',
                    'scope_bundle': 'default',
                    'required': true
                }
            ]
        }
    ]
};
/**
 * class that implements the Opal tool functions. Requirements:
 * - Must extend the Function class from the SDK
 * - Name must match the value of entry_point property from app.yml manifest
 * - Name must match the file name
 */
class OpalToolFunction extends app_sdk_1.Function {
    /**
     * Processing the request from Opal
     * Add your logic here to handle every tool declared in the discoveryPayload.
     */
    async perform() {
        // uncomment the following lines to enable bearer token authentication
        /*
        const bearerToken = (await storage.settings.get('bearer_token')).bearer_token as string;
        if (bearerToken && this.request.headers.get('Authorization') !== `Bearer ${bearerToken}`) {
          logger.warn('Invalid or missing bearer token', JSON.stringify(this.request));
          return new Response(401, 'Invalid or missing bearer token');
        }
        */
        /*
         * example: fetching configured username/password credentials
         *
        const auth = await storage.settings.get<AuthSection>('auth');
        */
        /*
         * example: fetching Google Oauth token from secret storage
         *
         const token = await storage.secrets.get<Token>('token');
         */
        if (this.request.path === '/discovery') {
            return new app_sdk_1.Response(200, discoveryPayload);
        }
        else if (this.request.path === '/tools/get-excel-details') {
            // LP addded:call to the helper function
            const params = this.extractParameters();
            const authData = this.extractAuthData();
            const response = await this.queryExcel(params, authData);
            return new app_sdk_1.Response(200, response);
        }
        else {
            return new app_sdk_1.Response(400, 'Invalid path');
        }
    }
    async queryExcel(parameters, authData) {
        const { asset_id } = parameters;
        try {
            if (!asset_id) {
                throw new Error('Missing required parameter: asset_id');
            }
            const assetDetails = await (0, cmp_1.getAssetFromCMP)(asset_id, authData);
            const dataImportBuffer = await this.downloadFileAsBuffer(assetDetails.url);
            const workbook = xlsx_1.default.read(dataImportBuffer);
            // Load the correct sheet
            const sheetName = 'Launch Data';
            const sheet = workbook.Sheets[sheetName];
            if (!sheet) {
                throw new Error(`Sheet "${sheetName}" not found in Excel file.`);
            }
            // Convert to JSON with proper typing
            const rows = xlsx_1.default.utils.sheet_to_json(sheet);
            const filteredData = rows
                .filter((row) => row['Campaign'] && row['Launch Date'])
                .map((row) => ({
                taskName: row['Campaign'],
                // We call the helper method formatExcelDate() to convert "01/11/2024" → "Nov 1, 2024"
                // So this change is purely for formatting the date
                dueDate: this.formatExcelDate(row['Launch Date']),
                // Note: `row` represents a single row from the Excel sheet
                // Each row is an object with column names as keys
                // We access the "Launch Date" column for this row via row['Launch Date']
            }));
            app_sdk_1.logger.info('Filtered rows (task name + due date):', filteredData);
            // Return the filtered data
            return { filteredData };
        }
        catch (error) {
            console.error('Error fetching CMP asset data:', error.message);
            throw new Error('Failed to fetch CMP asset data');
        }
    }
    // added this helper method to format Excel date strings
    formatExcelDate(value) {
        if (!value)
            return '';
        // Split the input "DD/MM/YYYY" into parts
        const [day, month, year] = value.split('/').map(Number);
        // Create a JavaScript Date object (months are 0-indexed)
        const date = new Date(year, month - 1, day);
        // Format as "Mon D, YYYY"
        return date.toLocaleDateString('en-US', {
            month: 'short', // "Nov"
            day: 'numeric', // 1
            year: 'numeric' // 2024
        });
    }
    extractAuthData() {
        // Extract auth data from the request headers
        if (this.request.bodyJSON && this.request.bodyJSON.auth) {
            // Standard format: { "parameters": { ... } }
            app_sdk_1.logger.info('Extracted authData from \'auth\' key:', this.request.bodyJSON.auth);
            return this.request.bodyJSON.auth;
        }
        else {
            // Fallback for direct testing: { "name": "value" }
            app_sdk_1.logger.warn('\'auth\' key not found in request body. Using body directly.');
            return this.request.bodyJSON;
        }
    }
    extractParameters() {
        // Extract parameters from the request body
        if (this.request.bodyJSON && this.request.bodyJSON.parameters) {
            // Standard format: { "parameters": { ... } }
            app_sdk_1.logger.info('Extracted parameters from \'parameters\' key:', this.request.bodyJSON.parameters);
            return this.request.bodyJSON.parameters;
        }
        else {
            // Fallback for direct testing: { "name": "value" }
            app_sdk_1.logger.warn('\'parameters\' key not found in request body. Using body directly.');
            return this.request.bodyJSON;
        }
    }
    async downloadFileAsBuffer(url) {
        const res = await axios_1.default.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(res.data);
    }
}
exports.OpalToolFunction = OpalToolFunction;
//# sourceMappingURL=OpalToolFunction.js.map