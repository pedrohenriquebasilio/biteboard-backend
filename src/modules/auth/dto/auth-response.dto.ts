export interface AuthResponseDto {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  restaurant: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    createdAt: Date;
  };
}

