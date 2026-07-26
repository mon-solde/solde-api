import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { UserModule } from '@modules/user/user.module';
import { VehicleModule } from '@modules/vehicle/vehicle.module';
import { WalletModule } from '@modules/wallet/wallet.module';
import { DebtModule } from '@modules/debt/debt.module';
import { ContactModule } from '@modules/contact/contact.module';
import { RecurringChargeModule } from '@modules/recurring-charge/recurring-charge.module';
import { MonthlyBudgetModule } from '@modules/monthly-budget/monthly-budget.module';
import { SavingsModule } from '@modules/savings/savings.module';
import { RequestContextModule } from 'nestjs-request-context';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ContextInterceptor } from '@libs/application/context/ContextInterceptor';
import { ExceptionInterceptor } from '@libs/application/interceptors/exception.interceptor';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { PrismaModule } from '@libs/db/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { validateEnv } from '@config/env.validation';

const interceptors = [
  {
    provide: APP_INTERCEPTOR,
    useClass: ContextInterceptor,
  },
  {
    provide: APP_INTERCEPTOR,
    useClass: ExceptionInterceptor,
  },
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }), // Must be first — loads .env and validates all required variables before any other module boots.
    EventEmitterModule.forRoot(),
    RequestContextModule,
    CqrsModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
    }),

    // Modules
    AuthModule,
    VehicleModule,
    UserModule,
    WalletModule,
    DebtModule,
    ContactModule,
    RecurringChargeModule,
    MonthlyBudgetModule,
    SavingsModule,
    PrismaModule,
  ],
  controllers: [],
  providers: [...interceptors],
})
export class AppModule {}
