import { routesV1 } from '@src/configs/app.routes';
import { UserPaginatedResponseDto } from '@src/modules/user/dtos/user.paginated.response.dto';
import { getHttpServer } from '@tests/setup/jestSetupAfterEnv';

export class ApiClient {
  private url = `/${routesV1.version}/${routesV1.user.root}`;

  async deleteUser(id: string): Promise<void> {
    const response = await getHttpServer().delete(`${this.url}/${id}`);
    return response.body;
  }

  async findAllUsers(): Promise<UserPaginatedResponseDto> {
    const response = await getHttpServer().get(this.url);
    return response.body;
  }
}
