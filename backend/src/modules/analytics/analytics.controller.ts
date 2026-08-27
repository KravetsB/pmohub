import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsFilterDto, QuarterlyAnalyticsFilterDto } from './analytics.dto';
import { ApiSuccessDto } from '../../common/dto/api-response.dto';

@ApiTags('analytics') @ApiBearerAuth() @Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}
  @Get('quarterly') @ApiOkResponse({ type: ApiSuccessDto })
  async quarterly(@Query() query: QuarterlyAnalyticsFilterDto) {
    return { success: true, data: await this.analytics.quarterly(query) };
  }

  @Get('annual') @ApiOkResponse({ type: ApiSuccessDto })
  async annual(@Query() query: AnalyticsFilterDto) {
    return { success: true, data: await this.analytics.annual(query) };
  }
}
