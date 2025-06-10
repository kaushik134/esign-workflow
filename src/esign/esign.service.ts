// src/esign/esign.service.ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { promises as fs } from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EsignService {
  // Base URL and routes for OpenSignLabs
  private routes = {
    create_document: 'createdocument',
    create_doc_from_template: 'createdocument',
    create_template: 'createtemplate',
    templatelist: 'templatelist',
    template_by_id: 'template',
  };

  constructor(
    private readonly httpService: HttpService,
    private configService: ConfigService,
  ) {}

  getApiToken(): string | undefined {
    return this.configService.get<string>('OPENSIGN_API_KEY');
  }

  getBaseUrl(): string | undefined {
    return this.configService.get<string>('OPENSIGN_BASE_URL');
  }

  async initiateWorkflow(payload: any): Promise<any> {
    // Build the full file path using the relative path provided in payload.filePath
    const fullFilePath = join(process.cwd(), payload.filePath);
    try {
      const fileData = await fs.readFile(fullFilePath);
      const fileBase64 = fileData.toString('base64');
      // Add the Base64 file content to the payload under the key "file"
      payload.file = fileBase64;
      // Optionally remove filePath if not needed by the API
      delete payload.filePath;
    } catch (error) {
      console.error('Error reading file from disk:', error);
      throw error;
    }

    // Enrich the payload with default values if not provided
    const enrichedPayload = {
      file: payload.file,
      title: payload.title || 'sample document',
      note: payload.note || 'sample Note',
      description: payload.description || 'sample Description',
      timeToCompleteDays: payload.timeToCompleteDays || 15,
      signers: payload.signers || [],
      folderId: payload.folderId || '',
      send_email: payload.send_email !== undefined ? payload.send_email : true,
      email_subject: payload.email_subject || '',
      email_body: payload.email_body || '',
      sendInOrder:
        payload.sendInOrder !== undefined ? payload.sendInOrder : true,
      enableOTP: payload.enableOTP !== undefined ? payload.enableOTP : false,
      enableTour: payload.enableTour !== undefined ? payload.enableTour : false,
      redirect_url: payload.redirect_url || '',
      sender_name: payload.sender_name || 'opensign™',
      sender_email: payload.sender_email || 'mailer@opensignlabs.com',
      allow_modifications:
        payload.allow_modifications !== undefined
          ? payload.allow_modifications
          : false,
    };

    // Note: Removed the extra comma at the end.
    const response: AxiosResponse<any> = await this._execute(
      'POST',
      this.routes.create_template,
      enrichedPayload,
    );
    return response.data;
  }

  async getTemplates(): Promise<any> {
    try {
      const response: AxiosResponse<any> = await this._execute(
        'GET',
        this.routes.templatelist,
        {},
      );
      return response.data;
    } catch (error) {
      console.error('Error getting templates:', error);
      throw error;
    }
  }

  async getTemplateById(id: string): Promise<any> {
    try {
      const observable = await this.httpService.get(
        `${this.getBaseUrl()}${this.routes.template_by_id}/${id}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'x-api-token': this.getApiToken(),
          },
        },
      );
      const response: AxiosResponse<any> = await firstValueFrom(observable);
      return response.data;
    } catch (error) {
      console.log('Error getting template By ID:', error);
      throw error;
    }
  }

  async createDocumentFromTemplateId(id: string, payload: any): Promise<any> {
    const response: AxiosResponse<any> = await this._execute(
      'POST',
      `${this.routes.create_doc_from_template}/${id}`,
      payload,
    );
    return response.data;
  }

  async role2SignAndUpdate(payload: any): Promise<any> {
    const apiUrl = 'https://sandbox.opensignlabs.com/api/role2';
    const response: AxiosResponse<any> = await firstValueFrom(
      this.httpService.post<any>(apiUrl, payload),
    );
    return response.data;
  }

  async _execute(method: string, path: string, payload: any): Promise<any> {
    try {
      console.log({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-api-token': this.getApiToken(),
      });
      // Wrap the observable with firstValueFrom so we get a Promise
      const observable = this.httpService[method.toLowerCase()](
        `${this.getBaseUrl()}${path}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'x-api-token': this.getApiToken(),
          },
        },
      );
      const response: AxiosResponse<any> = await firstValueFrom(observable);
      return response;
    } catch (error) {
      console.error('Error making http request:', error);
      throw error;
    }
  }
}
