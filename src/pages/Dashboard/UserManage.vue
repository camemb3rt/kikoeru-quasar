<template>
  <div>
    <q-card class="q-ma-md">
      <q-form @submit="updateAdminPassword()">
        <q-toolbar>
          <q-toolbar-title>Change admin password</q-toolbar-title>
        </q-toolbar>

        <div class="q-pa-sm">
          <q-input outlined dense type="password" label="New Password"
            v-model="adminNewPassword"
            lazy-rules
            :rules="[ val => val.length >= 5 || 'Must be at least 5 characters' ]"
          />

          <q-input outlined dense type="password" label="Repeat New Password"
            v-model="adminConfirmPassword"
            lazy-rules
            :rules="[
              val => val.length >= 5 || 'Must be at least 5 characters',
              val => val === adminNewPassword || 'Passwords do not match'
            ]"
          />

          <div class="row justify-end">
            <q-btn :loading="loadingUpdateAdminPassword" type="submit" color="primary" label="Update" />
          </div>
        </div>
      </q-form>
    </q-card>

    <q-card class="q-ma-md">
      <q-form @submit="addNewUser()">
        <q-toolbar>
          <q-toolbar-title>Add a new user</q-toolbar-title>
        </q-toolbar>

        <div class="q-pa-sm">
          <q-select dense outlined label="User Group" v-model="newuser.group" :options="groups" class="q-mb-md" />

          <q-input outlined dense
            v-model="newuser.name" label="Username"
            required
            lazy-rules
            :rules="[
                val => val.length >= 5 || 'Must be at least 5 characters',
                val => !users.find(user => user.name === val) || 'This name is already in use',
              ]" 
          />

          <q-input outlined dense label="Password"
            v-model="newuser.password"
            lazy-rules
            :rules="[ val => val.length >= 5 || 'Must be at least 5 characters' ]"
          />

          <div class="row justify-end">
            <q-btn :loading="loadingAddNewUser" type="submit" color="primary" label="Create" />
          </div>
        </div>
      </q-form>
    </q-card>

    <q-card class="q-ma-md q-pa-sm">
      <q-table
        title="All users"
        :data="users"
        :columns="columns"
        row-key="name"
        :selected-rows-label="getSelectedString"
        selection="multiple"
        :selected.sync="selected"
      />
      <div class="row justify-end">
        <q-btn :loading="loadingDeleteUsers" :disable="selected.length === 0" @click="confirm = true" color="primary" label="Delete" />
      </div>
    </q-card>

    <q-dialog v-model="confirm" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <span class="q-ma-sm text-h6">Are you sure you want to delete this user?</span>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn flat label="Confirm" color="primary" @click="deleteUsers()" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import NotifyMixin from '../../mixins/Notification.js'

export default {
  mixins: [NotifyMixin],

  data () {
    return {
      selected: [],
      columns: [
        { name: 'desc', required: true, label: 'Username', align: 'left', field: 'name', sortable: true },
        { name: 'calories', required: true, label: 'User Group', align: 'center', field: 'group', sortable: true },
      ],
      users: [],
      loadingDeleteUsers: false,

      newuser: {
        name: '',
        password: '',
        group: 'user'
      },
      groups: ['user', 'guest'],
      loadingAddNewUser: false,

      
      adminNewPassword: '',
      adminConfirmPassword: '',
      loadingUpdateAdminPassword: false,

      confirm: false
    }
  },

  methods: {
    getSelectedString () {
      return this.selected.length === 0 ? '' : `${this.selected.length} record${this.selected.length > 1 ? 's' : ''} selected of ${this.users.length}`
    },

    addNewUser () {
      this.loadingAddNewUser = true
      this.$axios.post('/api/credentials/user', {
        name: this.newuser.name,
        password: this.newuser.password,
        group: this.newuser.group
      })
        .then((response) => {
          this.users.push(this.newuser)
          this.loadingAddNewUser = false
          this.showSuccNotif(response.data.message)
          this.requestUsers()
        })
        .catch((error) => {
          this.loadingAddNewUser = false
          // 请求已发出，但服务器响应的状态码不在 2xx 范围内
          if (error.response.status === 422) {
            this.showErrNotif(error.response.data.errors[0].msg)
          } else if (error.response.status === 403) {
            this.showWarnNotif(error.response.data.error)
          } else {
            this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
          }
        })

    },

    deleteUsers () {
      this.loadingDeleteUsers = true
      this.$axios.delete('/api/credentials/user', {
        data: { users: this.selected },
      })
        .then((response) => {
          this.selected.forEach(selectedUser => {
            const index = this.users.findIndex(user => user.name === selectedUser.name)
            this.users.splice(index, 1)
          })
          this.loadingDeleteUsers = false
          this.showSuccNotif(response.data.message)
          this.requestUsers()
        })
        .catch((error) => {
          this.loadingDeleteUsers = false
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            if (error.response.status === 403) {
              this.showWarnNotif(error.response.data.error)
            } else {
              this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
            }
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },

    updateAdminPassword () {
      this.loadingUpdateAdminPassword = true
      this.$axios.put('/api/credentials/user', {
        name: 'admin',
        newPassword: this.adminNewPassword
      })
        .then((response) => {
          this.loadingUpdateAdminPassword = false
          try {
            // 删除旧 token
            this.$q.localStorage.set('jwt-token', '')
          } catch (err) {
            this.showErrNotif(err.message)
          }
          this.showSuccNotif(response.data.message)

          // 仅当启用鉴权时跳转到登录页面
          if (this.$store.state.User.auth) {
            console.log('Got here')
            this.$router.push('/login')
          }
        })
        .catch((error) => {
          this.loadingUpdateAdminPassword = false
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },

    requestUsers () {
      this.$axios.get('/api/credentials/users')
        .then((response) => {
          this.users = response.data.users
        })
        .catch((error) => {
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            if (error.response.status !== 401) {
              this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
            }
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },
  },

  created () {
    this.requestUsers()
  }
}
</script>