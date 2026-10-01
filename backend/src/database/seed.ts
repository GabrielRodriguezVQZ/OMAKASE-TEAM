import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities';

export async function seed(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);

  const hashedPassword = await bcrypt.hash('password123', 10);

  const users = [
    {
      nombre: 'María González',
      email: 'enfermeria@hospital.com',
      password_hash: hashedPassword,
      rol: UserRole.ENFERMERIA,
    },
    {
      nombre: 'Carlos Rodríguez',
      email: 'quirofano@hospital.com',
      password_hash: hashedPassword,
      rol: UserRole.QUIROFANO,
    },
    {
      nombre: 'Admin Sistema',
      email: 'admin@hospital.com',
      password_hash: hashedPassword,
      rol: UserRole.ADMIN,
    },
  ];

  for (const userData of users) {
    const existingUser = await userRepository.findOne({
      where: { email: userData.email },
    });
    if (!existingUser) {
      const user = userRepository.create(userData);
      await userRepository.save(user);
      console.log(`Usuario creado: ${userData.email} (${userData.rol})`);
    }
  }

  console.log('Seed completado');
}
