import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { ContactMessageDto } from './dto/contact-message.dto';
import { PartnershipEnquiryDto } from './dto/partnership-enquiry.dto';
import { EmailService } from './email.service';

@ApiTags('email')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Public()
  @Post('contact')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @ApiOperation({ summary: 'Send a public contact form submission' })
  async sendContactMessage(@Body() dto: ContactMessageDto) {
    await this.emailService.sendContactFormSubmission(dto);
    return {
      success: true,
      message: 'Message sent successfully',
    };
  }

  @Public()
  @Post('partnerships')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @ApiOperation({ summary: 'Send a public partnership enquiry' })
  async sendPartnershipEnquiry(@Body() dto: PartnershipEnquiryDto) {
    await this.emailService.sendPartnershipEnquiry(dto);
    return {
      success: true,
      message: 'Partnership enquiry submitted successfully',
    };
  }
}
