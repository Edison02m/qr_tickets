import React, { useEffect, useState } from 'react';

interface User {
	id: number;
	nombre: string;
	usuario: string;
	rol: 'admin' | 'vendedor';
	activo: boolean;
	fecha_creacion: string;
}

interface UserForm {
	nombre: string;
	usuario: string;
	password: string;
	rol: 'admin' | 'vendedor';
}

const defaultForm: UserForm = {
	nombre: '',
	usuario: '',
	password: '',
	rol: 'vendedor',
};

const UsersAdmin: React.FC = () => {
	const [users, setUsers] = useState<User[]>([]);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [form, setForm] = useState<UserForm>(defaultForm);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
	const [passwordValue, setPasswordValue] = useState('');
	const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
	const [error, setError] = useState('');

	useEffect(() => {
		loadUsers();
	}, []);

	// Effect para cerrar modales con ESC
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				if (isDialogOpen) {
					handleCloseDialog();
				} else if (isPasswordDialogOpen) {
					handleClosePasswordDialog();
				}
			}
		};

		// Solo agregar el listener si hay un modal abierto
		if (isDialogOpen || isPasswordDialogOpen) {
			document.addEventListener('keydown', handleKeyDown);
		}

		// Cleanup
		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [isDialogOpen, isPasswordDialogOpen]);

	const loadUsers = async () => {
		try {
			if (window.electronAPI) {
				const data = await window.electronAPI.getUsers();
				setUsers(data);
			}
		} catch (err) {
			setError('Error al cargar usuarios');
		}
	};

	const handleOpenDialog = (user?: User) => {
		setError('');
		if (user) {
			setForm({
				nombre: user.nombre,
				usuario: user.usuario,
				password: '',
				rol: user.rol,
			});
			setEditingId(user.id);
		} else {
			setForm(defaultForm);
			setEditingId(null);
		}
		setIsDialogOpen(true);
	};

	const handleCloseDialog = () => {
		setIsDialogOpen(false);
		setForm(defaultForm);
		setEditingId(null);
		setError('');
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		setForm(prev => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		if (!form.nombre.trim() || !form.usuario.trim() || (!editingId && !form.password.trim())) {
			setError('Todos los campos son obligatorios');
			return;
		}
			try {
				if (window.electronAPI) {
					let result;
					if (editingId) {
						result = await window.electronAPI.updateUser({
							id: editingId,
							nombre: form.nombre,
							usuario: form.usuario,
							rol: form.rol,
						});
					} else {
						result = await window.electronAPI.createUser(form);
					}
					
					// Verificar si la operación falló
					if (result && !result.success) {
						setError(result.error || 'Error al guardar usuario');
						return;
					}
					
					await loadUsers();
					handleCloseDialog();
				}
			} catch (err) {
				setError('Error al guardar usuario');
			}
	};

	const handleOpenPasswordDialog = (userId: number) => {
		setSelectedUserId(userId);
		setPasswordValue('');
		setIsPasswordDialogOpen(true);
		setError('');
	};

	const handleClosePasswordDialog = () => {
		setIsPasswordDialogOpen(false);
		setSelectedUserId(null);
		setPasswordValue('');
		setError('');
	};

	const handleChangePassword = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!passwordValue.trim()) {
			setError('La contraseña es obligatoria');
			return;
		}
		try {
			if (window.electronAPI && selectedUserId) {
				const result = await window.electronAPI.changeUserPassword(selectedUserId, passwordValue);
				
				// Verificar si la operación falló
				if (result && !result.success) {
					setError(result.error || 'Error al cambiar la contraseña');
					return;
				}
				
				handleClosePasswordDialog();
			}
		} catch (err) {
			setError('Error al cambiar la contraseña');
		}
	};

	const handleToggleActive = async (user: User) => {
		try {
			if (window.electronAPI) {
				const result = await window.electronAPI.toggleUserStatus(user.id, !user.activo);
				
				// Verificar si la operación falló
				if (result && !result.success) {
					setError(result.error || 'Error al cambiar estado');
					return;
				}
				
				await loadUsers();
			}
		} catch (err) {
			setError('Error al cambiar estado');
		}
	};

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="flex justify-between items-center mb-6">
				<div>
					<div className="w-8 h-0.5 bg-[#457373] mb-3 rounded-full"></div>
					<h1 className="text-xl font-light text-[#1D324D] tracking-tight">Gestión de Usuarios</h1>
					<p className="text-[#7C4935]/70 text-xs font-light mt-1">Administra usuarios del sistema</p>
				</div>
				<button
					onClick={() => handleOpenDialog()}
					className="bg-gradient-to-r from-[#1D324D] to-[#457373] text-white px-5 py-2.5 rounded-2xl text-sm font-medium hover:from-[#457373] hover:to-[#1D324D] transition-all duration-300 shadow-md hover:scale-[1.02]"
				>
					Nuevo Usuario
				</button>
			</div>

			{error && (
				<div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-xl">
					<div className="flex items-center">
						<svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<p className="text-sm text-red-700">{error}</p>
					</div>
				</div>
			)}

			{/* Table */}
			<div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full">
						<thead className="bg-gradient-to-r from-[#F1EADC] to-[#DFE4E4]">
							<tr>
								<th className="px-8 py-6 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">Nombre</th>
								<th className="px-8 py-6 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">Usuario</th>
								<th className="px-8 py-6 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">Rol</th>
								<th className="px-8 py-6 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">Estado</th>
								<th className="px-8 py-6 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">Fecha</th>
								<th className="px-8 py-6 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">Acciones</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[#DFE4E4]/30">
							{users.map(user => (
								<tr key={user.id} className="hover:bg-[#F1EADC]/20 transition-colors duration-200">
									<td className="px-8 py-6 whitespace-nowrap">
										<div className="text-sm font-medium text-[#1D324D]">{user.nombre}</div>
									</td>
									<td className="px-8 py-6 whitespace-nowrap">
										<div className="text-sm text-[#7C4935]">{user.usuario}</div>
									</td>
									<td className="px-8 py-6 whitespace-nowrap">
										<span className={`px-3 py-1 rounded-full text-xs font-medium ${
											user.rol === 'admin' 
												? 'bg-[#457373]/20 text-[#457373]' 
												: 'bg-[#7C4935]/20 text-[#7C4935]'
										}`}>
											{user.rol === 'admin' ? 'Administrador' : 'Vendedor'}
										</span>
									</td>
									<td className="px-8 py-6 whitespace-nowrap">
										<span className={`px-3 py-1 rounded-full text-xs font-medium ${
											user.activo 
												? 'bg-green-100 text-green-700' 
												: 'bg-red-100 text-red-700'
										}`}>
											{user.activo ? 'Activo' : 'Inactivo'}
										</span>
									</td>
									<td className="px-8 py-6 whitespace-nowrap">
										<div className="text-sm text-[#7C4935]/80">
											{new Date(user.fecha_creacion).toLocaleDateString()}
										</div>
									</td>
									<td className="px-8 py-6 whitespace-nowrap">
										<div className="flex space-x-2">
											<button
												onClick={() => handleOpenDialog(user)}
												className="p-2 text-[#457373] hover:text-[#1D324D] hover:bg-[#F1EADC]/50 rounded-xl transition-all duration-200"
												title="Editar"
											>
												<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
													<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
												</svg>
											</button>
											<button
												onClick={() => handleOpenPasswordDialog(user.id)}
												className="p-2 text-[#7C4935] hover:text-[#1D324D] hover:bg-[#F1EADC]/50 rounded-xl transition-all duration-200"
												title="Cambiar Contraseña"
											>
												<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
													<path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
												</svg>
											</button>
											<button
												onClick={() => handleToggleActive(user)}
												className={`p-2 rounded-xl transition-all duration-200 ${
													user.activo 
														? 'text-green-600 hover:text-green-800 hover:bg-green-50' 
														: 'text-red-600 hover:text-red-800 hover:bg-red-50'
												}`}
												title={user.activo ? 'Desactivar usuario' : 'Activar usuario'}
											>
												{user.activo ? (
													<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
														<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
													</svg>
												) : (
													<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
														<path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
													</svg>
												)}
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{/* Dialogo de crear/editar usuario */}
			{isDialogOpen && (
				<div className="fixed inset-0 bg-[#1D324D]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
					<div className="bg-white/95 backdrop-blur-sm rounded-3xl max-w-md w-full shadow-2xl border border-white/50 relative">
						{/* Close button */}
						<button
							onClick={handleCloseDialog}
							className="absolute top-4 right-4 p-2 text-[#7C4935] hover:text-[#1D324D] hover:bg-[#F1EADC]/50 rounded-full transition-all duration-200 z-10"
							title="Cerrar"
						>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
							</svg>
						</button>

						{/* Header */}
						<div className="px-6 py-4 border-b border-[#DFE4E4]/30">
							<div className="w-8 h-1 bg-[#457373] mb-3 rounded-full"></div>
							<h3 className="text-xl font-light text-[#1D324D]">
								{editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
							</h3>
						</div>

						{/* Form */}
						<form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
							<div>
								<label className="block text-sm font-medium text-[#1D324D] mb-2">
									Nombre
								</label>
								<input
									type="text"
									name="nombre"
									value={form.nombre}
									onChange={handleInputChange}
									className="w-full px-4 py-3 bg-[#F1EADC]/30 border border-[#DFE4E4] rounded-2xl text-[#1D324D] placeholder-[#7C4935]/60 focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300"
									placeholder="Ingresa el nombre completo"
									required
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-[#1D324D] mb-2">
									Usuario
								</label>
								<input
									type="text"
									name="usuario"
									value={form.usuario}
									onChange={handleInputChange}
									className="w-full px-4 py-3 bg-[#F1EADC]/30 border border-[#DFE4E4] rounded-2xl text-[#1D324D] placeholder-[#7C4935]/60 focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300"
									placeholder="Ingresa el nombre de usuario"
									required
								/>
							</div>
							{!editingId && (
								<div>
									<label className="block text-sm font-medium text-[#1D324D] mb-2">
										Contraseña
									</label>
									<input
										type="password"
										name="password"
										value={form.password}
										onChange={handleInputChange}
										className="w-full px-4 py-3 bg-[#F1EADC]/30 border border-[#DFE4E4] rounded-2xl text-[#1D324D] placeholder-[#7C4935]/60 focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300"
										placeholder="Ingresa la contraseña"
										required
									/>
								</div>
							)}
							<div>
								<label className="block text-sm font-medium text-[#1D324D] mb-2">
									Rol
								</label>
								<select
									name="rol"
									value={form.rol}
									onChange={handleInputChange}
									className="w-full px-4 py-3 bg-[#F1EADC]/30 border border-[#DFE4E4] rounded-2xl text-[#1D324D] focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300"
									required
								>
									<option value="admin">Administrador</option>
									<option value="vendedor">Vendedor</option>
								</select>
							</div>

							{/* Buttons */}
							<div className="flex justify-end space-x-3 pt-4">
								<button
									type="button"
									onClick={handleCloseDialog}
									className="px-6 py-3 text-[#7C4935] hover:text-[#1D324D] font-medium transition-colors duration-200"
								>
									Cancelar
								</button>
								<button
									type="submit"
									className="bg-gradient-to-r from-[#1D324D] to-[#457373] text-white px-6 py-3 rounded-2xl font-medium hover:from-[#457373] hover:to-[#1D324D] transition-all duration-300 shadow-lg hover:scale-[1.02]"
								>
									{editingId ? 'Actualizar' : 'Crear'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Dialogo de cambiar contraseña */}
			{isPasswordDialogOpen && (
				<div className="fixed inset-0 bg-[#1D324D]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
					<div className="bg-white/95 backdrop-blur-sm rounded-3xl max-w-sm w-full shadow-2xl border border-white/50 relative">
						{/* Close button */}
						<button
							onClick={handleClosePasswordDialog}
							className="absolute top-4 right-4 p-2 text-[#7C4935] hover:text-[#1D324D] hover:bg-[#F1EADC]/50 rounded-full transition-all duration-200 z-10"
							title="Cerrar"
						>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
							</svg>
						</button>

						{/* Header */}
						<div className="px-6 py-4 border-b border-[#DFE4E4]/30">
							<div className="w-8 h-1 bg-[#457373] mb-3 rounded-full"></div>
							<h3 className="text-xl font-light text-[#1D324D]">
								Cambiar Contraseña
							</h3>
						</div>

						{/* Form */}
						<form onSubmit={handleChangePassword} className="px-6 py-4 space-y-4">
							<div>
								<label className="block text-sm font-medium text-[#1D324D] mb-2">
									Nueva Contraseña
								</label>
								<input
									type="password"
									value={passwordValue}
									onChange={e => setPasswordValue(e.target.value)}
									className="w-full px-4 py-3 bg-[#F1EADC]/30 border border-[#DFE4E4] rounded-2xl text-[#1D324D] placeholder-[#7C4935]/60 focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300"
									placeholder="Ingresa la nueva contraseña"
									required
								/>
							</div>

							{/* Buttons */}
							<div className="flex justify-end space-x-3 pt-4">
								<button
									type="button"
									onClick={handleClosePasswordDialog}
									className="px-6 py-3 text-[#7C4935] hover:text-[#1D324D] font-medium transition-colors duration-200"
								>
									Cancelar
								</button>
								<button
									type="submit"
									className="bg-gradient-to-r from-[#1D324D] to-[#457373] text-white px-6 py-3 rounded-2xl font-medium hover:from-[#457373] hover:to-[#1D324D] transition-all duration-300 shadow-lg hover:scale-[1.02]"
								>
									Guardar
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

export default UsersAdmin;
