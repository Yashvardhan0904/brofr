import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UsersResponse } from './entities/users-response.entity';
import { UserStats } from './entities/user-stats.entity';
import { UpdateProfileInput } from './dto/update-profile.input';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserPayload } from '../common/types/user-payload.type';
import { Role } from '@prisma/client';

@Resolver(() => User)
export class UsersResolver {
  constructor(private usersService: UsersService) {}

  /**
   * Get current user profile
   */
  @UseGuards(JwtAuthGuard)
  @Query(() => User, { description: 'Get current user profile' })
  async me(@CurrentUser() user: UserPayload): Promise<User> {
    return this.usersService.getProfile(user.id);
  }

  /**
   * Update current user profile
   */
  @UseGuards(JwtAuthGuard)
  @Mutation(() => User, { description: 'Update current user profile' })
  async updateProfile(
    @CurrentUser() user: UserPayload,
    @Args('input') input: UpdateProfileInput,
  ): Promise<User> {
    return this.usersService.updateProfile(user.id, input);
  }

  /**
   * Get all users (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Query(() => UsersResponse, { description: 'Get all users (admin only)' })
  async allUsers(
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 })
    skip: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 20 })
    take: number,
  ): Promise<UsersResponse> {
    const { users, total } = await this.usersService.findAll(skip, take);

    return {
      users,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    };
  }

  /**
   * Get user by ID (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Query(() => User, {
    nullable: true,
    description: 'Get user by ID (admin only)',
  })
  async user(@Args('id', { type: () => ID }) id: string): Promise<User | null> {
    return this.usersService.findById(id);
  }

  /**
   * Update user role (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Mutation(() => User, { description: 'Update user role (admin only)' })
  async updateUserRole(
    @Args('userId', { type: () => ID }) userId: string,
    @Args('role', { type: () => Role }) role: Role,
  ): Promise<User> {
    return this.usersService.updateRole(userId, role);
  }

  /**
   * Deactivate user (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Mutation(() => User, { description: 'Deactivate user account (admin only)' })
  async deactivateUser(@Args('userId', { type: () => ID }) userId: string): Promise<User> {
    return this.usersService.deactivateUser(userId);
  }

  /**
   * Activate user (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Mutation(() => User, { description: 'Activate user account (admin only)' })
  async activateUser(@Args('userId', { type: () => ID }) userId: string): Promise<User> {
    return this.usersService.activateUser(userId);
  }

  /**
   * Get user statistics (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Query(() => UserStats, { description: 'Get user statistics (admin only)' })
  async userStats(): Promise<UserStats> {
    return this.usersService.getUserStats();
  }
}
