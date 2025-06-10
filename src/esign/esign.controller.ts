// src/esign/esign.controller.ts
import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  Get,
  Param,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Response } from 'express';
import { EsignService } from './esign.service';

@Controller('esign')
export class EsignController {
  constructor(private readonly esignService: EsignService) {}

  // File Upload Endpoint
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const fileExtName = extname(file.originalname);
          const fileName = `${Date.now()}${fileExtName}`;
          callback(null, fileName);
        },
      }),
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return {
      filename: file.filename,
      path: file.path,
    };
  }

  // Preview Endpoint to serve the uploaded PDF
  @Get('preview/:filename')
  previewFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(process.cwd(), 'uploads', filename);
    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(404).send('File not found');
      }
    });
  }

  // Role 1 initiates the workflow
  @Post('initiate')
  async initiateWorkflow(@Body() body: any) {
    try {
      const result = await this.esignService.initiateWorkflow(body);
      return result;
    } catch (error) {
      console.log(error.message);
      return error.message;
    }
  }

  // Role 2 reviews/signs and updates Role 3's email
  @Post('role2')
  async role2Action(@Body() body: any) {
    try {
      const template = await this.esignService.getTemplateById(body.templateId);
      if (!template) {
        throw new Error('Template not found');
      }
      let signers = template.signers;
      const documentPayload = {
        signers: signers.map((signer) =>
          signer.role === body.role
            ? {
                ...signer,
                name: body.role3Name,
                email: body.role3Email,
                phone: body.role3Phone,
              }
            : signer,
        ),
        folderId: '',
        send_email: true,
        email_subject: '',
        email_body: '',
        sendInOrder: true,
        timeToCompleteDays: 15,
        enableOTP: false,
        enableTour: false,
        sender_name: 'opensign™',
        sender_email: 'mailer@opensignlabs.com',
        allow_modifications: false,
      };
      const result = await this.esignService.createDocumentFromTemplateId(
        body.templateId,
        documentPayload,
      );
      return result;
    } catch (error) {
      console.error(error.message);
      throw error.message;
    }
  }
}
