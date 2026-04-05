import { faker } from '@faker-js/faker';
import { UserData, Expense, Category } from '../types';

export const testDataFactory = {
  /**
   * Generates a random user object.
   */
  generateUser(): UserData {
    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      password: faker.internet.password({ length: 12 }),
      username: faker.internet.username(),
      role: faker.helpers.arrayElement(['admin', 'user', 'manager']),
    };
  },

  /**
   * Generates a random expense object.
   */
  generateExpense(): Expense {
    return {
      amount: parseFloat(faker.finance.amount({ min: 10, max: 5000 })),
      category: faker.helpers.arrayElement(['Food', 'Transport', 'Rent', 'Shopping', 'Health', 'Travel']),
      description: faker.commerce.productDescription(),
      date: faker.date.recent().toISOString().split('T')[0],
      paymentMethod: faker.helpers.arrayElement(['Cash', 'Credit Card', 'Debit Card', 'UPI']),
      status: faker.helpers.arrayElement(['pending', 'completed', 'cancelled']),
    };
  },

  /**
   * Generates a random category object.
   */
  generateCategory(): Category {
    return {
      id: faker.string.uuid(),
      name: faker.commerce.department(),
      icon: faker.helpers.arrayElement(['home', 'coffee', 'car', 'activity', 'shopping-cart']),
      color: faker.color.rgb(),
    };
  },
};
