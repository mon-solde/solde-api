import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Routes marked with @Public() skip Firebase token verification.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
