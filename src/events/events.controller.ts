import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiProperty,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { EventDocument } from '../schemas/event.schema';

class BusPickupRequest {
  @ApiProperty({
    example: 'Central Station',
    description: 'The pickup location name',
  })
  location: string;

  @ApiProperty({
    example: '2025-07-15T09:00:00Z',
    description: 'The departure time for the bus pickup',
  })
  departureTime: string;
}

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new event (Admin only)' })
  @ApiBody({
    type: CreateEventDto,
    description: 'Event creation data',
    examples: {      example1: {
        value: {
          name: 'Summer Tech Conference 2025',
          date: '2025-07-15T09:00:00Z',
          states: ['California', 'New York'],
          maxAttendees: 500,
          branches: {
            "California": ["San Francisco", "Los Angeles"],
            "New York": ["Manhattan", "Brooklyn"]
          },
          busPickups: [
            {
              location: 'Central Station',
              departureTime: '2025-07-15T07:00:00Z',
              maxCapacity: 50,
              currentCount: 0,
            },
          ],
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Event successfully created',
    type: CreateEventDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all events' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all events',
    type: [CreateEventDto],
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  findAll() {
    return this.eventsService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active events' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of active events',
    type: [CreateEventDto],
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  getActiveEvents() {
    return this.eventsService.getActiveEvents();
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get all upcoming events (future-dated, active)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of upcoming events',
    type: [CreateEventDto],
  })
  async getUpcomingEvents() {
    // Upcoming = isActive and date >= today
    const today = new Date();
    return this.eventsService.findUpcoming(today);
  }

  @Get('state/:state')
  @ApiOperation({ summary: 'Get events by state' })
  @ApiParam({
    name: 'state',
    description: 'The state name to filter events by',
    example: 'California',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of events in the specified state',
    type: [CreateEventDto],
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No events found in the specified state',
  })
  getEventsByState(@Param('state') state: string) {
    return this.eventsService.getEventsByState(state);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the event to retrieve',
    example: '645f3c7e8d6e5a7b1c9d2e3f',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The event details',
    type: CreateEventDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Event not found' })
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Post(':id/bus-pickup')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Add a bus pickup location to an event (Admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the event to add a bus pickup to',
    example: '645f3c7e8d6e5a7b1c9d2e3f',
  })
  @ApiBody({
    type: BusPickupRequest,
    description: 'Bus pickup details',
    examples: {
      example1: {
        value: {
          location: 'Central Station',
          departureTime: '2025-07-15T07:00:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bus pickup successfully added',
    type: CreateEventDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Event not found' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  addBusPickup(
    @Param('id') id: string,
    @Body() busPickupData: BusPickupRequest,
  ) {
    return this.eventsService.addBusPickup(
      id,
      busPickupData.location,
      busPickupData.departureTime,
    );
  }

  @Post(':id/join')
  @Roles(Role.MARKETER)
  @ApiOperation({ summary: 'Join an event as a marketer' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the event to join',
    example: '645f3c7e8d6e5a7b1c9d2e3f',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully joined the event',
    type: CreateEventDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Marketer access required',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Event not found' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Already joined this event',
  })
  joinEvent(@Param('id') id: string, @Request() req) {
    return this.eventsService.addMarketerToEvent(id, req.user.userId);
  }
  @Delete(':id/leave')
  @Roles(Role.MARKETER)
  @ApiOperation({ summary: 'Leave an event as a marketer' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the event to leave',
    example: '645f3c7e8d6e5a7b1c9d2e3f',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully left the event',
    type: CreateEventDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Marketer access required',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Event not found' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Not a participant in this event',
  })
  leaveEvent(@Param('id') id: string, @Request() req) {
    return this.eventsService.removeMarketerFromEvent(id, req.user.userId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete an event (Admin only)' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the event to delete',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Event successfully deleted',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Event not found' })
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }

  @Post(':eventId/concierge-requests')
  @Roles(Role.CONCIERGE)
  @ApiOperation({ summary: 'Request to be assigned as concierge for an event' })
  @ApiParam({
    name: 'eventId',
    description: 'The ID of the event to request concierge assignment for',
    example: '645f3c7e8d6e5a7b1c9d2e3f',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Request submitted for admin approval',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Concierge access required',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Event not found' })
  async requestConcierge(@Param('eventId') eventId: string, @Request() req) {
    return this.eventsService.requestConcierge(eventId, req.user.userId);
  }

  @Get('concierge-requests/pending')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all pending concierge requests (admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of pending concierge requests' })
  async getAllPendingConciergeRequests() {
    return this.eventsService.getAllPendingConciergeRequests();
  }

  @Post(':eventId/concierge-requests/:requestId/review')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Approve or reject a concierge request (admin only)' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'requestId', description: 'Concierge request ID' })
  @ApiBody({ schema: { properties: { approve: { type: 'boolean' } } } })
  @ApiResponse({ status: HttpStatus.OK, description: 'Request reviewed' })
  async reviewConciergeRequest(
    @Param('eventId') eventId: string,
    @Param('requestId') requestId: string,
    @Body('approve') approve: boolean,
    @Request() req
  ) {
    return this.eventsService.reviewConciergeRequest(eventId, requestId, approve, req.user.userId);
  }

  @Get('concierge-requests/approved')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all approved concierge assignments (admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of approved concierge assignments' })
  async getAllApprovedConcierges() {
    return this.eventsService.getAllApprovedConcierges();
  }

  // Concierge cancels their own pending request for an event
  @Delete(':eventId/concierge-requests')
  @Roles(Role.CONCIERGE)
  @ApiOperation({ summary: 'Cancel your pending concierge request for an event' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Request cancelled' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No pending request found' })  async cancelConciergeRequest(@Param('eventId') eventId: string, @Request() req) {
    return this.eventsService.cancelConciergeRequest(eventId, req.user.userId);
  }

  @Post(':eventId/check-in')
  @Roles(Role.CONCIERGE)
  @ApiOperation({ summary: 'Check in an attendee to an event' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiBody({ schema: { properties: { phone: { type: 'string' } } } })
  @ApiResponse({ status: HttpStatus.OK, description: 'Attendee checked in successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Attendee not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Attendee already checked in' })
  async checkInAttendee(
    @Param('eventId') eventId: string, 
    @Body('phone') phone: string,
    @Request() req
  ) {
    return this.eventsService.checkInAttendee(eventId, phone, req.user.userId);
  }
}
