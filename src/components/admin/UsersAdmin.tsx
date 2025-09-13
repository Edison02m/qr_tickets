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
					if (editingId) {
						await window.electronAPI.updateUser({
							id: editingId,
							nombre: form.nombre,
							usuario: form.usuario,
							rol: form.rol,
						});
					} else {
						await window.electronAPI.createUser(form);
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
				await window.electronAPI.changeUserPassword(selectedUserId, passwordValue);
				handleClosePasswordDialog();
			}
		} catch (err) {
			setError('Error al cambiar la contraseña');
		}
	};

	const handleToggleActive = async (user: User) => {
		try {
			if (window.electronAPI) {
				await window.electronAPI.toggleUserStatus(user.id, !user.activo);
				await loadUsers();
			}
		} catch (err) {
			setError('Error al cambiar estado');
		}
	};

	const handleDelete = async (user: User) => {
		if (!window.confirm('¿Está seguro de eliminar/desactivar este usuario?')) return;
		try {
			if (window.electronAPI) {
				await window.electronAPI.deleteUser(user.id);
				await loadUsers();
			}
		} catch (err) {
			setError('Error al eliminar usuario');
		}
	};

	return (
		<div className="p-6">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h1>
				<button
					onClick={() => handleOpenDialog()}
					className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
				>
					Nuevo Usuario
				</button>
			</div>

			{error && <div className="mb-4 text-red-600">{error}</div>}

			<div className="overflow-x-auto bg-white rounded-lg shadow">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activo</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Creación</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{users.map(user => (
							<tr key={user.id} className="hover:bg-gray-50">
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.nombre}</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.usuario}</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.rol}</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm">
									<span className={`px-2 py-1 rounded-full text-xs ${user.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
										{user.activo ? 'Activo' : 'Inactivo'}
									</span>
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(user.fecha_creacion).toLocaleString()}</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
									<button
										onClick={() => handleOpenDialog(user)}
										className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs"
									>Editar</button>
									<button
										onClick={() => handleOpenPasswordDialog(user.id)}
										className="px-2 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 text-xs"
									>Cambiar Contraseña</button>
									<button
										onClick={() => handleToggleActive(user)}
										className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-xs"
									>{user.activo ? 'Desactivar' : 'Activar'}</button>
									<button
										onClick={() => handleDelete(user)}
										className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
									>Eliminar</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Dialogo de crear/editar usuario */}
			{isDialogOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
					<div className="bg-white rounded-lg max-w-md w-full">
						<div className="px-6 py-4 border-b border-gray-200">
							<h3 className="text-lg font-medium text-gray-900">{editingId ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
						</div>
						<form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
								<input
									type="text"
									name="nombre"
									value={form.nombre}
									onChange={handleInputChange}
									className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-300"
									required
								/>
							</div>
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
												<input
													type="text"
													name="usuario"
													value={form.usuario}
													onChange={handleInputChange}
													className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-300"
													required
												/>
											</div>
							{!editingId && (
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
									<input
										type="password"
										name="password"
										value={form.password}
										onChange={handleInputChange}
										className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-300"
										required
									/>
								</div>
							)}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
								<select
									name="rol"
									value={form.rol}
									onChange={handleInputChange}
									className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-300"
									required
								>
									<option value="admin">Administrador</option>
									<option value="vendedor">Vendedor</option>
								</select>
							</div>
							<div className="pt-4 bg-gray-50 flex justify-end space-x-3">
								<button
									type="button"
									onClick={handleCloseDialog}
									className="px-4 py-2 text-gray-700 hover:text-gray-900"
								>Cancelar</button>
								<button
									type="submit"
									className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
								>Guardar</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Dialogo de cambiar contraseña */}
			{isPasswordDialogOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
					<div className="bg-white rounded-lg max-w-md w-full">
						<div className="px-6 py-4 border-b border-gray-200">
							<h3 className="text-lg font-medium text-gray-900">Cambiar Contraseña</h3>
						</div>
						<form onSubmit={handleChangePassword} className="px-6 py-4 space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
								<input
									type="password"
									value={passwordValue}
									onChange={e => setPasswordValue(e.target.value)}
									className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-300"
									required
								/>
							</div>
							<div className="pt-4 bg-gray-50 flex justify-end space-x-3">
								<button
									type="button"
									onClick={handleClosePasswordDialog}
									className="px-4 py-2 text-gray-700 hover:text-gray-900"
								>Cancelar</button>
								<button
									type="submit"
									className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
								>Guardar</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

export default UsersAdmin;
