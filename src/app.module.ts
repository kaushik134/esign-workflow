// 
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule } from '@nestjs/config';
import appConfig from '../config/app.config';
import { join } from 'path';
import { EsignModule } from './esign/esign.module';

@Module({
  imports: [
    // Serve static files from the "public" directory
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    EsignModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: '.env',
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
