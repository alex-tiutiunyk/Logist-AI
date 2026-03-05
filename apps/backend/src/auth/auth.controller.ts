import { Body, Controller, Get, HttpCode, Post, Request, UseGuards } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

@Controller()
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('auth/login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Request() req: Express.Request & { user: { id: string; email: string; role: string } }) {
    return req.user;
  }
}
