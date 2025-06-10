import { Test, TestingModule } from '@nestjs/testing';
import { EsignService } from './esign.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

describe('EsignService', () => {
  let service: EsignService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        HttpModule,
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              OPENSIGN_API_KEY: 'OPENSIGN_API_KEY',
              OPENSIGN_BASE_URL: 'OPENSIGN_BASE_URL',
            }),
          ],
        }),
      ],
      providers: [EsignService],
    }).compile();

    service = module.get<EsignService>(EsignService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
