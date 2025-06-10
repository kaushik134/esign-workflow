import { Test, TestingModule } from '@nestjs/testing';
import { EsignController } from './esign.controller';
import { EsignService } from './esign.service';
import { Response } from 'express';

describe('EsignController', () => {
  let controller: EsignController;
  let service: EsignService;

  const mockEsignService = {
    initiateWorkflow: jest
      .fn()
      .mockResolvedValue({ message: 'Success', objectId: '1234' }),
    // Added mock for getTemplateById returning a template with signers array
    getTemplateById: jest.fn().mockResolvedValue({
      signers: [
        { role: 'role3', name: '', email: '', phone: '' },
        { role: 'role2', name: 'Test Role2', email: 'dummy@yopmail.com', phone: '' },
      ],
    }),
    // Added mock for createDocumentFromTemplateId returning a valid document result
    createDocumentFromTemplateId: jest.fn().mockResolvedValue({
      objectId: 'doc5678',
      signurl: [
        { email: 'prole3@yopmail.com', url: 'https://example.com/sign/role3' },
        { email: 'dummy@yopmail.com', url: 'https://example.com/sign/dummy' },
      ],
      message: 'Document sent successfully!',
    }),
    role2Action: jest
      .fn()
      .mockResolvedValue({ 
        signurl: [{ email: 'prole3@yopmail.com', url: 'https://example.com/sign/role3' }],
        message: 'Role 3 signed successfully!',
      }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EsignController],
      providers: [
        {
          provide: EsignService,
          useValue: mockEsignService,
        },
      ],
    }).compile();

    controller = module.get<EsignController>(EsignController);
    service = module.get<EsignService>(EsignService);
  });

  describe('uploadFile', () => {
    it('should return file details', () => {
      // Simulate a file upload by providing a fake file object.
      const file = {
        filename: 'test.pdf',
        path: './uploads/test.pdf',
      } as Express.Multer.File;
      const result = controller.uploadFile(file);
      expect(result).toEqual({
        filename: 'test.pdf',
        path: './uploads/test.pdf',
      });
    });
  });

  describe('previewFile', () => {
    it('should call res.sendFile with correct file path', () => {
      const filename = 'test.pdf';
      // Create a mock response object with a sendFile method.
      const res = { sendFile: jest.fn() } as unknown as Response;
      controller.previewFile(filename, res);
      // __dirname in the compiled code will be "dist", so we expect a string that includes "uploads/test.pdf"
      expect(res.sendFile).toHaveBeenCalledWith(
        expect.stringContaining('uploads/test.pdf'),
      );
    });
  });

  describe('initiateWorkflow', () => {
    it('should return workflow initiation result with correct types', async () => {
      const payload = { file: 'base64data', title: 'Offer Letter', signers: [] };
      const result = await controller.initiateWorkflow(payload);
      expect(result).toEqual({ message: 'Success', objectId: '1234' });
      expect(mockEsignService.initiateWorkflow).toHaveBeenCalledWith(payload);
      // Validate types
      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
      expect(typeof result.objectId).toBe('string');
      expect(result.objectId.length).toBeGreaterThan(0);
    });
  });

  describe('role2Action', () => {
    it('should return role2 signing result with non-empty strings for message, objectId, email and url', async () => {
      const payload = {
        templateId: 'uLD3vU3P4O',
        role3Email: 'prole3@yopmail.com',
        role3Name: 'Puneet Role3',
        role3Phone: '',
        role: 'role3',
      };
      const result = await controller.role2Action(payload);
      
      // Check that result is an object with expected properties
      expect(typeof result).toBe('object');
      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
      expect(typeof result.objectId).toBe('string');
      expect(result.objectId.length).toBeGreaterThan(0);
      
      // Check signurl array and properties
      expect(Array.isArray(result.signurl)).toBe(true);
      expect(result.signurl.length).toBeGreaterThan(0);
      result.signurl.forEach((item) => {
        expect(typeof item.email).toBe('string');
        expect(item.email.length).toBeGreaterThan(0);
        expect(typeof item.url).toBe('string');
        expect(item.url.length).toBeGreaterThan(0);
      });

      expect(mockEsignService.getTemplateById).toHaveBeenCalledWith(payload.templateId);
      expect(mockEsignService.createDocumentFromTemplateId).toHaveBeenCalledWith(
        payload.templateId,
        expect.any(Object),
      );
    });
  });

});
