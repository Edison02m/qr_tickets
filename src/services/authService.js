const bcrypt = require('bcryptjs');
const Database = require('../database/database'); // Singleton instance

class AuthService {
  constructor() {
    this.db = Database; // Database es ahora una instancia singleton
  }

  async login(usuario, password) {
    try {
      const user = await this.db.getUserByUsername(usuario);
      
      if (!user) {
        return { success: false, message: 'Usuario no encontrado' };
      }

      const isPasswordValid = bcrypt.compareSync(password, user.password);
      
      if (!isPasswordValid) {
        return { success: false, message: 'Contraseña incorrecta' };
      }

      return { 
        success: true, 
        user: {
          id: user.id,
          nombre: user.nombre,
          usuario: user.usuario,
          rol: user.rol
        }
      };
    } catch (error) {
      console.error('Error en login:', error);
      return { success: false, message: 'Error al iniciar sesión' };
    }
  }

  async getCurrentUser() {
    return new Promise((resolve) => {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('get-current-user').then(resolve);
    });
  }

  async logout() {
    return new Promise((resolve) => {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('logout').then(resolve);
    });
  }
}

module.exports = AuthService;